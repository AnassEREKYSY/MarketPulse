using MarketPulse.Application;
using MarketPulse.Domain;

namespace MarketPulse.Tests;

sealed class FakeMarket : IJobMarket
{
    public int Calls;
    public List<SearchRequest> Searches = [];
    public Func<SearchRequest, SearchPage> OnSearch = r => new SearchPage(120, 50000, Enumerable.Range(0, 10).Select(i => Job(i)).ToList());

    public static Job Job(int i, decimal? salary = 50000, Seniority s = Seniority.Mid, WorkMode w = WorkMode.Onsite, string region = "Île-de-France") =>
        new($"j{i}", $"Job {i}", "Acme", "Paris", ["France", region, "Paris"], 48.85, 2.35, DateTimeOffset.UtcNow, "https://x", salary, salary, false,
            ContractType.Permanent, ContractTime.FullTime, "IT Jobs", "it-jobs", "", w, s);

    public Task<SearchPage> SearchAsync(SearchRequest r, CancellationToken ct) { Calls++; Searches.Add(r); return Task.FromResult(OnSearch(r)); }
    public Task<List<Bucket>> HistogramAsync(string c, string? w, string? l, CancellationToken ct) { Calls++; return Task.FromResult(Stats.ToBuckets([new(40000, 10), new(50000, 20), new(60000, 10)])); }
    public Task<List<MonthValue>> SalaryHistoryAsync(string c, string? cat, string? w, int m, CancellationToken ct) { Calls++; return Task.FromResult(new List<MonthValue> { new("2026-09", 48000) }); }
    public Task<List<RegionCount>> RegionsAsync(string c, string? w, string? l, CancellationToken ct) { Calls++; return Task.FromResult(new List<RegionCount> { new("Île-de-France", 80) }); }
    public Task<List<CompanyStat>> TopCompaniesAsync(string c, string? w, string? l, CancellationToken ct) { Calls++; return Task.FromResult(new List<CompanyStat> { new("Acme", 5, 61000), new("Solo", 1, 90000) }); }
    public Task<List<Category>> CategoriesAsync(string c, CancellationToken ct) { Calls++; return Task.FromResult(new List<Category>()); }
}

sealed class DictCache : ICache
{
    readonly Dictionary<string, object> _d = [];
    public async Task<T> GetOrCreateAsync<T>(string key, TimeSpan ttl, Func<CancellationToken, Task<T>> f, CancellationToken ct)
    {
        if (_d.TryGetValue(key, out var v)) return (T)v;
        var r = await f(ct); _d[key] = r!; return r;
    }
}
