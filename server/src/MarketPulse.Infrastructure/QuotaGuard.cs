using MarketPulse.Application;

namespace MarketPulse.Infrastructure;

/// <summary>
/// Keeps us under Adzuna's free-tier limits (about 25 calls a minute and 250 a day) so the key never gets blocked.
/// Over the limit we fail fast with a clear message; the cache still serves everything already fetched.
/// </summary>
public sealed class QuotaGuard(AdzunaOptions options, TimeProvider clock)
{
    private readonly object _gate = new();
    private readonly Queue<DateTimeOffset> _lastMinute = new();
    private DateOnly _day;
    private int _today;
    private DateTimeOffset _coolUntil;
    // At most 2 provider calls at once, spaced out: a screen fires several calls and Adzuna rejects bursts.
    private readonly SemaphoreSlim _lane = new(2, 2);
    private DateTimeOffset _lastCall;
    private static readonly TimeSpan Spacing = TimeSpan.FromMilliseconds(350);

    public int UsedToday { get { lock (_gate) { Roll(clock.GetUtcNow()); return _today; } } }
    public int DailyLimit => options.DailyLimit;

    public void Take()
    {
        lock (_gate)
        {
            var now = clock.GetUtcNow();
            Roll(now);
            if (now < _coolUntil)
                throw new MarketException(429, "The job data provider asked us to slow down. Results already loaded still work; try again in a few seconds.");
            while (_lastMinute.Count > 0 && now - _lastMinute.Peek() > TimeSpan.FromMinutes(1)) _lastMinute.Dequeue();
            if (_today >= options.DailyLimit)
                throw new MarketException(429, "Today's job data allowance is used up. Searches already made still work; new ones will be available tomorrow (UTC).");
            if (_lastMinute.Count >= options.PerMinuteLimit)
                throw new MarketException(429, "Too many new searches in the last minute. Please wait a few seconds and try again.");
            _lastMinute.Enqueue(now);
            _today++;
        }
    }

    /// <summary>Waits for a free lane and keeps calls at least <see cref="Spacing"/> apart. Dispose the result when the call is done.</summary>
    public async Task<IDisposable> TurnAsync(CancellationToken ct)
    {
        await _lane.WaitAsync(ct);
        TimeSpan wait;
        lock (_gate)
        {
            var now = clock.GetUtcNow();
            var next = _lastCall + Spacing;
            wait = next > now ? next - now : TimeSpan.Zero;
            _lastCall = (next > now ? next : now);
        }
        if (wait > TimeSpan.Zero) await Task.Delay(wait, clock, ct);
        return new Release(_lane);
    }

    /// <summary>After the provider answers 429, stop calling it for a while instead of hammering it.</summary>
    public void CoolDown(TimeSpan duration)
    {
        lock (_gate) { var until = clock.GetUtcNow() + duration; if (until > _coolUntil) _coolUntil = until; }
    }

    private sealed class Release(SemaphoreSlim s) : IDisposable { public void Dispose() => s.Release(); }

    private void Roll(DateTimeOffset now)
    {
        var day = DateOnly.FromDateTime(now.UtcDateTime);
        if (day != _day) { _day = day; _today = 0; }
    }
}
