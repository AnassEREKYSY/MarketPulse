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

    public int UsedToday { get { lock (_gate) { Roll(clock.GetUtcNow()); return _today; } } }
    public int DailyLimit => options.DailyLimit;

    public void Take()
    {
        lock (_gate)
        {
            var now = clock.GetUtcNow();
            Roll(now);
            while (_lastMinute.Count > 0 && now - _lastMinute.Peek() > TimeSpan.FromMinutes(1)) _lastMinute.Dequeue();
            if (_today >= options.DailyLimit)
                throw new MarketException(429, "Today's job data allowance is used up. Searches already made still work; new ones will be available tomorrow (UTC).");
            if (_lastMinute.Count >= options.PerMinuteLimit)
                throw new MarketException(429, "Too many new searches in the last minute. Please wait a few seconds and try again.");
            _lastMinute.Enqueue(now);
            _today++;
        }
    }

    private void Roll(DateTimeOffset now)
    {
        var day = DateOnly.FromDateTime(now.UtcDateTime);
        if (day != _day) { _day = day; _today = 0; }
    }
}
