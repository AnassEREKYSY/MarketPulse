using MarketPulse.Domain;

namespace MarketPulse.Tests;

public class StatsTests
{
    static List<Bucket> H(params (decimal, int)[] b) => Stats.ToBuckets(b.Select(x => new KeyValuePair<decimal, int>(x.Item1, x.Item2)));

    [Fact]
    public void Buckets_are_sorted_and_chained()
    {
        var b = H((40000, 5), (20000, 1), (30000, 4));
        Assert.Equal([20000m, 30000m, 40000m], b.Select(x => x.From));
        Assert.Equal(30000m, b[0].To);
        Assert.Null(b[^1].To);
    }

    [Fact]
    public void Median_is_interpolated_inside_its_bucket()
    {
        // 10 ads: 2 in 20-30k, 6 in 30-40k, 2 in 40k+. The 5th ad is half way through the 30-40k bucket.
        var b = H((20000, 2), (30000, 6), (40000, 2));
        Assert.Equal(35000m, Stats.Percentile(b, 50));
        Assert.Equal(20000m + 10000m * 0.5m, Stats.Percentile(b, 10));
    }

    [Fact]
    public void Empty_histogram_has_no_percentiles() => Assert.Null(Stats.Percentile(H(), 50));

    [Fact]
    public void Median_of_values()
    {
        Assert.Equal(3m, Stats.Median([5m, 1m, 3m]));
        Assert.Equal(25m, Stats.Median([10m, 40m, 20m, 30m]));
        Assert.Null(Stats.Median([]));
    }

    [Fact]
    public void Shares_are_sorted_with_percentages_and_skip_blanks()
    {
        var s = Stats.Shares(new[] { "a", "b", "a", "", "a" }, x => x);
        Assert.Equal("a", s[0].Name);
        Assert.Equal(60, s[0].Percent);
        Assert.DoesNotContain(s, x => x.Name == "");
    }
}
