namespace MarketPulse.Domain;

public sealed record Bucket(decimal From, decimal? To, int Count);
public sealed record Share(string Name, int Count, double Percent);

/// <summary>Pure statistics used by the use cases (unit tested).</summary>
public static class Stats
{
    /// <summary>Percentile (0-100) of a sorted-by-bucket histogram, interpolated inside the bucket.</summary>
    public static decimal? Percentile(IReadOnlyList<Bucket> buckets, double p)
    {
        var total = buckets.Sum(b => b.Count);
        if (total == 0) return null;
        var target = total * p / 100.0;
        double seen = 0;
        for (var i = 0; i < buckets.Count; i++)
        {
            var b = buckets[i];
            if (b.Count == 0) continue;
            if (seen + b.Count >= target)
            {
                var width = (b.To ?? (i > 0 ? b.From + (b.From - buckets[i - 1].From) : b.From * 1.25m)) - b.From;
                var inside = (decimal)((target - seen) / b.Count);
                return Math.Round(b.From + width * inside, 0);
            }
            seen += b.Count;
        }
        return buckets[^1].From;
    }

    /// <summary>Adzuna returns {"20000": 12, "40000": 30, ...}: bucket lower bounds with counts.</summary>
    public static List<Bucket> ToBuckets(IEnumerable<KeyValuePair<decimal, int>> raw)
    {
        var sorted = raw.Where(kv => kv.Key >= 0 && kv.Value >= 0).OrderBy(kv => kv.Key).ToList();
        return sorted.Select((kv, i) => new Bucket(kv.Key, i + 1 < sorted.Count ? sorted[i + 1].Key : null, kv.Value)).ToList();
    }

    public static decimal? Median(IEnumerable<decimal> values)
    {
        var v = values.Order().ToList();
        if (v.Count == 0) return null;
        return v.Count % 2 == 1 ? v[v.Count / 2] : Math.Round((v[v.Count / 2 - 1] + v[v.Count / 2]) / 2, 0);
    }

    /// <summary>Counts per key with percentages, largest first, keys ordered by name on ties.</summary>
    public static List<Share> Shares<T>(IReadOnlyCollection<T> items, Func<T, string> key, int take = int.MaxValue)
    {
        if (items.Count == 0) return [];
        return items.GroupBy(key).Where(g => !string.IsNullOrWhiteSpace(g.Key))
            .Select(g => new Share(g.Key, g.Count(), Math.Round(100.0 * g.Count() / items.Count, 1)))
            .OrderByDescending(s => s.Count).ThenBy(s => s.Name, StringComparer.OrdinalIgnoreCase)
            .Take(take).ToList();
    }

    public static double Percent(int part, int total) => total == 0 ? 0 : Math.Round(100.0 * part / total, 1);

    /// <summary>Jobs per day for the last <paramref name="days"/> days (oldest first), zero-filled.</summary>
    public static List<(DateOnly Day, int Count)> PerDay(IEnumerable<Job> jobs, int days, DateTimeOffset now)
    {
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var counts = jobs.GroupBy(j => DateOnly.FromDateTime(j.Created.UtcDateTime)).ToDictionary(g => g.Key, g => g.Count());
        return Enumerable.Range(0, days).Select(i => today.AddDays(i - days + 1)).Select(d => (d, counts.GetValueOrDefault(d))).ToList();
    }
}
