using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using MarketPulse.Application;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace MarketPulse.Infrastructure;

/// <summary>
/// Memory first, then JSON files on disk (survive restarts and redeploys, so the daily quota is not spent again).
/// Identical requests in flight share one provider call. When the provider fails (quota, outage),
/// an expired copy is served rather than an error.
/// </summary>
public sealed class TieredCache(IMemoryCache memory, string? directory, TimeProvider clock, ILogger<TieredCache> log) : ICache
{
    static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };
    readonly ConcurrentDictionary<string, Lazy<Task<object>>> _inFlight = new();

    sealed record Entry<T>(DateTimeOffset Expires, T Value);

    public async Task<T> GetOrCreateAsync<T>(string key, TimeSpan ttl, Func<CancellationToken, Task<T>> factory, CancellationToken ct)
    {
        if (memory.TryGetValue(key, out T? hit) && hit is not null) return hit;

        var file = directory is null ? null : Path.Combine(directory, Hash(key) + ".json");
        var disk = await ReadAsync<T>(file, ct);
        var now = clock.GetUtcNow();
        if (disk is not null && disk.Expires > now)
        {
            memory.Set(key, disk.Value, disk.Expires);
            return disk.Value;
        }

        var lazy = _inFlight.GetOrAdd(key, _ => new Lazy<Task<object>>(async () => (object)(await factory(CancellationToken.None))!));
        try
        {
            var value = (T)await lazy.Value.WaitAsync(ct);
            var expires = clock.GetUtcNow() + ttl;
            memory.Set(key, value, expires);
            await WriteAsync(file, new Entry<T>(expires, value));
            return value;
        }
        catch (MarketException e) when (disk is not null && e.Status is 429 or 503 or 504)
        {
            log.LogInformation("Serving stale cache for {Key} ({Reason})", key, e.Message);
            memory.Set(key, disk.Value, TimeSpan.FromMinutes(10));
            return disk.Value;
        }
        finally
        {
            _inFlight.TryRemove(new KeyValuePair<string, Lazy<Task<object>>>(key, lazy));
        }
    }

    async Task<Entry<T>?> ReadAsync<T>(string? file, CancellationToken ct)
    {
        if (file is null || !File.Exists(file)) return null;
        try
        {
            await using var s = File.OpenRead(file);
            return await JsonSerializer.DeserializeAsync<Entry<T>>(s, Json, ct);
        }
        catch (Exception e) when (e is IOException or JsonException or UnauthorizedAccessException)
        {
            log.LogDebug(e, "Ignoring unreadable cache file {File}", file);
            return null;
        }
    }

    async Task WriteAsync<T>(string? file, Entry<T> entry)
    {
        if (file is null) return;
        try
        {
            Directory.CreateDirectory(directory!);
            var tmp = file + "." + Guid.NewGuid().ToString("N")[..8] + ".tmp";
            await File.WriteAllTextAsync(tmp, JsonSerializer.Serialize(entry, Json));
            File.Move(tmp, file, overwrite: true);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            log.LogWarning(e, "Could not write cache file {File}", file);
        }
    }

    /// <summary>Removes files expired for more than a week (stale copies are still useful for a while).</summary>
    public void Prune()
    {
        if (directory is null || !Directory.Exists(directory)) return;
        foreach (var f in Directory.EnumerateFiles(directory, "*.json"))
            if (File.GetLastWriteTimeUtc(f) < clock.GetUtcNow().UtcDateTime.AddDays(-8)) try { File.Delete(f); } catch (IOException) { }
    }

    static string Hash(string key) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)))[..32].ToLowerInvariant();
}
