using MarketPulse.Application;
using MarketPulse.Domain;

namespace MarketPulse.Tests;

public class MarketServiceTests
{
    readonly FakeMarket _m = new();
    MarketService S() => new(_m, new DictCache());

    [Fact]
    public async Task Overview_uses_full_market_percentiles_and_sample_shares()
    {
        _m.OnSearch = r => new SearchPage(500, 52000, [FakeMarket.Job(1, w: WorkMode.Remote), FakeMarket.Job(2), FakeMarket.Job(3, null), FakeMarket.Job(4)]);
        var o = await S().OverviewAsync("FR", " .NET  core ", null, default);
        Assert.Equal(".NET core", o.What);
        Assert.Equal(500, o.TotalJobs);
        Assert.Equal(55000m, o.Salary.Median); // half way through the 50-60k bucket
        Assert.Equal(25, o.RemotePercent);
        Assert.Equal(75, o.SalaryAdvertisedPercent);
        Assert.Contains(_m.Searches, s => s.Sort == SortBy.Date && s.MaxDaysOld == 7);
        Assert.All(_m.Searches, s => Assert.InRange(s.PageSize, 1, 50));
    }

    [Fact]
    public async Task Screens_share_cached_provider_calls()
    {
        var s = S();
        await s.OverviewAsync("fr", "java", null, default);
        var after = _m.Calls;
        await s.OverviewAsync("fr", "JAVA", null, default);
        Assert.Equal(after, _m.Calls);
        await s.CompareAsync("fr", null, ["java", "go"], default);
        Assert.Equal(after + 2, _m.Calls); // only "go" is new
    }

    [Fact]
    public async Task Remote_filter_requires_the_word_and_pages_stay_in_range()
    {
        var p = await S().JobsAsync(new JobsQuery("fr", "react", null, Page: 999, PageSize: 500, WorkMode: WorkMode.Remote), default);
        var req = _m.Searches.Single();
        Assert.Equal("react remote", req.What);
        Assert.Equal(50, req.PageSize);
        Assert.Equal(20, req.Page);
        Assert.Equal(3, p.Pages);
    }

    [Fact]
    public async Task Salaries_group_with_enough_data_and_skip_tiny_companies()
    {
        _m.OnSearch = r => new SearchPage(100, 50000, Enumerable.Range(r.Page * 10, 6).Select(i => FakeMarket.Job(i, 40000 + i * 1000, i % 2 == 0 ? Seniority.Senior : Seniority.Junior)).ToList());
        var d = await S().SalariesAsync("fr", "go", null, default);
        Assert.Equal(["Junior", "Senior"], d.BySeniority.Select(g => g.Name));
        Assert.Equal("IT Jobs", d.CategoryLabel);
        Assert.Single(d.History);
        Assert.Equal(["Acme"], d.TopPayingCompanies.Select(c => c.Name));
    }

    [Fact]
    public async Task Countries_convert_to_euros()
    {
        _m.OnSearch = r => new SearchPage(10, 100000, [FakeMarket.Job(1, 100000)]);
        var d = await S().CountriesAsync("python", ["us", "fr", "us"], default);
        Assert.Equal(2, d.Items.Count);
        var us = d.Items.Single(i => i.Code == "us");
        Assert.Equal(88000m, us.MeanSalaryEur);
    }

    [Theory]
    [InlineData("zz")]
    [InlineData("")]
    public async Task Unknown_country_is_a_400(string c)
    {
        var e = await Assert.ThrowsAsync<MarketException>(() => S().OverviewAsync(c, "x", null, default));
        Assert.Equal(400, e.Status);
    }

    [Fact]
    public async Task Compare_needs_two_to_four_distinct_terms()
    {
        var e = await Assert.ThrowsAsync<MarketException>(() => S().CompareAsync("fr", null, ["go", "GO", " "], default));
        Assert.Equal(400, e.Status);
    }
}
