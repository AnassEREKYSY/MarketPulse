using MarketPulse.Domain;

namespace MarketPulse.Application;

/// <summary>
/// The use cases behind each screen. Provider calls go through the cache with shared keys,
/// so opening Overview, Salaries and Map for the same search costs the quota only once.
/// </summary>
public sealed class MarketService(IJobMarket market, ICache cache)
{
    static readonly TimeSpan SearchTtl = TimeSpan.FromHours(6);
    static readonly TimeSpan AggregateTtl = TimeSpan.FromHours(12);
    static readonly TimeSpan HistoryTtl = TimeSpan.FromHours(24);
    const int Sample = 50; // Adzuna's maximum page size

    // Overview ------------------------------------------------------------------

    public async Task<OverviewDto> OverviewAsync(string country, string? what, string? where, CancellationToken ct)
    {
        var c = CountryOf(country); what = Clean(what); where = Clean(where);
        var relevant = Search(new(c.Code, what, where, 1, Sample), ct);
        var recent = Optional(Search(new(c.Code, what, where, 1, 10, SortBy.Date, MaxDaysOld: 7), ct), new SearchPage(0, null, []));
        var histogram = Optional(Histogram(c.Code, what, where, ct), []);
        var regions = Optional(Regions(c.Code, what, where, ct), []);
        var companies = Optional(Companies(c.Code, what, where, ct), []);
        await Task.WhenAll(relevant, recent, histogram, regions, companies);

        var sample = relevant.Result.Jobs;
        return new OverviewDto(
            c.Code, c.Currency, what, where, relevant.Result.Count,
            Summary(relevant.Result.MeanSalary, histogram.Result, sample), histogram.Result,
            Stats.Percent(sample.Count(j => j.WorkMode == WorkMode.Remote), sample.Count),
            Stats.Percent(sample.Count(j => j.WorkMode == WorkMode.Hybrid), sample.Count),
            Stats.Percent(sample.Count(j => j.Salary is not null && !j.SalaryIsEstimate), sample.Count),
            sample.Count,
            Stats.Shares(sample, j => Label(j.Contract)),
            Stats.Shares(sample, j => Label(j.Time)),
            Stats.Shares(sample, j => j.Seniority == Seniority.Unspecified ? "Not stated" : j.Seniority.ToString()),
            regions.Result.Take(10).ToList(),
            companies.Result.Take(10).ToList(),
            recent.Result.Count,
            recent.Result.Jobs.Take(8).Select(JobDto.From).ToList());
    }

    // Jobs ----------------------------------------------------------------------

    public async Task<JobsPageDto> JobsAsync(JobsQuery q, CancellationToken ct)
    {
        var c = CountryOf(q.Country);
        var what = Clean(q.What);
        // Adzuna has no work-mode filter: requiring the word in the ad is the honest equivalent.
        if (q.WorkMode is WorkMode.Remote) what = $"{what} remote".Trim();
        if (q.WorkMode is WorkMode.Hybrid) what = $"{what} hybrid".Trim();
        var size = Math.Clamp(q.PageSize, 5, Sample);
        // Adzuna stops paging around 1,000 results; keep pages inside that window.
        var page = Math.Clamp(q.Page, 1, Math.Max(1, 1000 / size));
        var r = await Search(new(c.Code, what, Clean(q.Where), page, size, q.Sort, q.MaxDaysOld, q.SalaryMin, q.Contract, q.Time, Clean(q.Category)), ct);
        var pages = (int)Math.Ceiling(Math.Min(r.Count, 1000) / (double)size);
        return new JobsPageDto(r.Count, page, size, pages, c.Currency, r.Jobs.Select(JobDto.From).ToList());
    }

    // Compare skills --------------------------------------------------------------

    public async Task<CompareDto> CompareAsync(string country, string? where, IReadOnlyList<string> queries, CancellationToken ct)
    {
        var c = CountryOf(country); where = Clean(where);
        var list = queries.Select(Clean).OfType<string>().Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (list.Count is < 2 or > 4) throw new MarketException(400, "Compare between 2 and 4 skills or job titles.");

        var items = await Task.WhenAll(list.Select(async q =>
        {
            var search = Search(new(c.Code, q, where, 1, Sample), ct);
            var histogram = Optional(Histogram(c.Code, q, where, ct), []);
            await Task.WhenAll(search, histogram);
            var sample = search.Result.Jobs;
            return new CompareItem(q, search.Result.Count, Summary(search.Result.MeanSalary, histogram.Result, sample),
                Stats.Percent(sample.Count(j => j.WorkMode == WorkMode.Remote), sample.Count),
                Stats.Percent(sample.Count(j => j.WorkMode == WorkMode.Hybrid), sample.Count),
                Stats.Shares(sample, j => j.Seniority == Seniority.Unspecified ? "Not stated" : j.Seniority.ToString()),
                Stats.Shares(sample, j => j.Region, 1).FirstOrDefault()?.Name,
                Stats.Shares(sample, j => j.Company, 1).FirstOrDefault()?.Name);
        }));
        return new CompareDto(c.Code, c.Currency, where, items.ToList());
    }

    // Salary explorer -------------------------------------------------------------

    public async Task<SalariesDto> SalariesAsync(string country, string? what, string? where, CancellationToken ct)
    {
        var c = CountryOf(country); what = Clean(what); where = Clean(where);
        var page1 = Search(new(c.Code, what, where, 1, Sample), ct);
        var page2 = Optional(Search(new(c.Code, what, where, 2, Sample), ct), new SearchPage(0, null, []));
        var histogram = Optional(Histogram(c.Code, what, where, ct), []);
        var companies = Optional(Companies(c.Code, what, where, ct), []);
        await Task.WhenAll(page1, page2, histogram, companies);

        var sample = page1.Result.Jobs.Concat(page2.Result.Jobs).DistinctBy(j => j.Id).ToList();
        var paid = sample.Where(j => j.Salary is not null).ToList();

        // Salary history only exists per category: use the category most of these ads belong to.
        var category = sample.Where(j => j.CategoryTag is not null).GroupBy(j => j.CategoryTag!)
            .OrderByDescending(g => g.Count()).FirstOrDefault();
        var history = category is null ? [] : await Optional(Cached($"history:{c.Code}:{category.Key}:{Key(where)}", HistoryTtl,
            t => market.SalaryHistoryAsync(c.Code, category.Key, where, 12, t), ct), []);

        return new SalariesDto(c.Code, c.Currency, what, where,
            Summary(page1.Result.MeanSalary, histogram.Result, paid), histogram.Result,
            category?.First().Category, history,
            Groups(paid, j => j.Seniority == Seniority.Unspecified ? null : j.Seniority.ToString())
                .OrderBy(g => Array.IndexOf(SeniorityOrder, g.Name)).ToList(),
            Groups(paid, j => string.IsNullOrWhiteSpace(j.Region) ? null : j.Region).OrderByDescending(g => g.Median).Take(8).ToList(),
            companies.Result.Where(x => x.AverageSalary is > 0 && x.Count >= 2).OrderByDescending(x => x.AverageSalary).Take(8).ToList(),
            paid.Count);
    }

    // Countries --------------------------------------------------------------------

    public async Task<CountriesDto> CountriesAsync(string? what, IReadOnlyList<string> codes, CancellationToken ct)
    {
        what = Clean(what);
        var list = codes.Select(CountryOf).DistinctBy(x => x.Code).ToList();
        if (list.Count is < 2 or > 6) throw new MarketException(400, "Compare between 2 and 6 countries.");

        var items = await Task.WhenAll(list.Select(async c =>
        {
            var r = await Search(new(c.Code, what, null, 1, Sample), ct);
            var median = Stats.Median(r.Jobs.Select(j => j.Salary).OfType<decimal>());
            return new CountryItem(c.Code, c.Name, c.Currency, r.Count,
                Round(r.MeanSalary), Round(r.MeanSalary * c.EurRate), median, Round(median * c.EurRate),
                Stats.Percent(r.Jobs.Count(j => j.WorkMode == WorkMode.Remote), r.Jobs.Count),
                Stats.Shares(r.Jobs, j => j.Region, 1).FirstOrDefault()?.Name);
        }));
        return new CountriesDto(what, Countries.RatesAsOf, items.ToList());
    }

    // Map ----------------------------------------------------------------------------

    public async Task<MapDto> MapAsync(string country, string? what, string? where, CancellationToken ct)
    {
        var c = CountryOf(country); what = Clean(what); where = Clean(where);
        var page1 = Search(new(c.Code, what, where, 1, Sample), ct);
        var page2 = Optional(Search(new(c.Code, what, where, 2, Sample), ct), new SearchPage(0, null, []));
        var regions = Optional(Regions(c.Code, what, where, ct), []);
        await Task.WhenAll(page1, page2, regions);

        var sample = page1.Result.Jobs.Concat(page2.Result.Jobs).DistinctBy(j => j.Id).ToList();
        var points = sample.Where(j => j.Latitude is not null && j.Longitude is not null)
            .GroupBy(j => string.IsNullOrWhiteSpace(j.Location) ? $"{j.Latitude:F2},{j.Longitude:F2}" : j.Location)
            .Select(g => new MapPoint(g.Key, Math.Round(g.Average(j => j.Latitude!.Value), 4), Math.Round(g.Average(j => j.Longitude!.Value), 4),
                g.Count(), Stats.Median(g.Select(j => j.Salary).OfType<decimal>())))
            .OrderByDescending(p => p.Count).ToList();
        return new MapDto(c.Code, c.Currency, what, where, page1.Result.Count, sample.Count, points, regions.Result.Take(15).ToList());
    }

    public Task<List<Category>> CategoriesAsync(string country, CancellationToken ct)
    {
        var c = CountryOf(country);
        return Cached($"categories:{c.Code}", TimeSpan.FromDays(7), t => market.CategoriesAsync(c.Code, t), ct);
    }

    // Helpers ---------------------------------------------------------------------------

    static readonly string[] SeniorityOrder = ["Junior", "Mid", "Senior", "Lead"];

    Task<SearchPage> Search(SearchRequest r, CancellationToken ct) => Cached(
        $"search:{r.Country}:{Key(r.What)}:{Key(r.Where)}:{r.Page}:{r.PageSize}:{r.Sort}:{r.MaxDaysOld}:{r.SalaryMin}:{r.Contract}:{r.Time}:{Key(r.Category)}",
        SearchTtl, t => market.SearchAsync(r, t), ct);

    Task<List<Bucket>> Histogram(string c, string? what, string? where, CancellationToken ct) =>
        Cached($"histogram:{c}:{Key(what)}:{Key(where)}", AggregateTtl, t => market.HistogramAsync(c, what, where, t), ct);

    Task<List<RegionCount>> Regions(string c, string? what, string? where, CancellationToken ct) =>
        Cached($"regions:{c}:{Key(what)}:{Key(where)}", AggregateTtl, t => market.RegionsAsync(c, what, where, t), ct);

    Task<List<CompanyStat>> Companies(string c, string? what, string? where, CancellationToken ct) =>
        Cached($"companies:{c}:{Key(what)}:{Key(where)}", AggregateTtl, t => market.TopCompaniesAsync(c, what, where, t), ct);

    /// <summary>Secondary data (charts around the main numbers): if the provider fails, show the page without it.</summary>
    static async Task<T> Optional<T>(Task<T> task, T fallback)
    {
        try { return await task; }
        catch (MarketException e) when (e.Status is 400 or 429 or 503 or 504) { return fallback; }
    }

    Task<T> Cached<T>(string key, TimeSpan ttl, Func<CancellationToken, Task<T>> factory, CancellationToken ct) =>
        cache.GetOrCreateAsync(key, ttl, factory, ct);

    /// <summary>Percentiles from the full-market histogram; falls back to the sample when the histogram is empty.</summary>
    internal static SalarySummary Summary(decimal? mean, List<Bucket> histogram, IEnumerable<Job> sample)
    {
        if (histogram.Sum(b => b.Count) > 0)
            return new(Round(mean), Stats.Percentile(histogram, 10), Stats.Percentile(histogram, 25), Stats.Percentile(histogram, 50),
                Stats.Percentile(histogram, 75), Stats.Percentile(histogram, 90));
        var values = sample.Select(j => j.Salary).OfType<decimal>().Order().ToList();
        if (values.Count == 0) return new(Round(mean), null, null, null, null, null);
        decimal At(double p) => values[(int)Math.Clamp(Math.Round(p / 100 * (values.Count - 1)), 0, values.Count - 1)];
        return new(Round(mean), At(10), At(25), Stats.Median(values), At(75), At(90));
    }

    static IEnumerable<SalaryGroup> Groups(IEnumerable<Job> paid, Func<Job, string?> key) =>
        paid.GroupBy(key).Where(g => g.Key is not null && g.Count() >= 3)
            .Select(g => new SalaryGroup(g.Key!, Stats.Median(g.Select(j => j.Salary!.Value))!.Value, g.Count()));

    internal static Country CountryOf(string? code) =>
        Countries.Find(code) ?? throw new MarketException(400, $"Unknown country \"{code}\". Use one of: {string.Join(", ", Countries.All.Select(c => c.Code))}.");

    internal static string? Clean(string? s)
    {
        s = s?.Trim();
        if (string.IsNullOrEmpty(s)) return null;
        if (s.Length > 100) throw new MarketException(400, "Search terms are limited to 100 characters.");
        return string.Join(' ', s.Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    static string Key(string? s) => s?.ToLowerInvariant() ?? "";
    static decimal? Round(decimal? d) => d is null ? null : Math.Round(d.Value, 0);
    static string Label(ContractType c) => c switch { ContractType.Permanent => "Permanent", ContractType.Contract => "Contract", _ => "Not stated" };
    static string Label(ContractTime t) => t switch { ContractTime.FullTime => "Full time", ContractTime.PartTime => "Part time", _ => "Not stated" };
}

public sealed record JobsQuery(
    string Country, string? What, string? Where, int Page = 1, int PageSize = 20, SortBy Sort = SortBy.Relevance,
    int? MaxDaysOld = null, int? SalaryMin = null, ContractType Contract = ContractType.Unspecified,
    ContractTime Time = ContractTime.Unspecified, WorkMode? WorkMode = null, string? Category = null);
