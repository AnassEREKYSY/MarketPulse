using MarketPulse.Domain;

namespace MarketPulse.Application;

public enum SortBy { Relevance, Date, Salary }

public sealed record SearchRequest(
    string Country,
    string? What,
    string? Where,
    int Page = 1,
    int PageSize = 20,
    SortBy Sort = SortBy.Relevance,
    int? MaxDaysOld = null,
    int? SalaryMin = null,
    ContractType Contract = ContractType.Unspecified,
    ContractTime Time = ContractTime.Unspecified,
    string? Category = null);

public sealed record SearchPage(int Count, decimal? MeanSalary, List<Job> Jobs);
public sealed record RegionCount(string Name, int Count);
public sealed record CompanyStat(string Name, int Count, decimal? AverageSalary);
public sealed record Category(string Tag, string Label);
public sealed record MonthValue(string Month, decimal Value);

/// <summary>Job market data source (Adzuna in production, a fake in tests).</summary>
public interface IJobMarket
{
    Task<SearchPage> SearchAsync(SearchRequest request, CancellationToken ct);
    Task<List<Bucket>> HistogramAsync(string country, string? what, string? where, CancellationToken ct);
    Task<List<MonthValue>> SalaryHistoryAsync(string country, string? category, string? where, int months, CancellationToken ct);
    Task<List<RegionCount>> RegionsAsync(string country, string? what, string? where, CancellationToken ct);
    Task<List<CompanyStat>> TopCompaniesAsync(string country, string? what, string? where, CancellationToken ct);
    Task<List<Category>> CategoriesAsync(string country, CancellationToken ct);
}

/// <summary>Read-through cache. The provider has a small daily quota, so most answers are cached for hours.</summary>
public interface ICache
{
    Task<T> GetOrCreateAsync<T>(string key, TimeSpan ttl, Func<CancellationToken, Task<T>> factory, CancellationToken ct);
}

/// <summary>An error with a message safe to show to users. Status is the HTTP status the API returns.</summary>
public sealed class MarketException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}
