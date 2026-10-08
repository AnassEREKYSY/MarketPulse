using MarketPulse.Domain;

namespace MarketPulse.Application;

public sealed record CountryDto(string Code, string Name, string Currency, decimal EurRate);

public sealed record JobDto(
    string Id, string Title, string Company, string Location, string Region, double? Latitude, double? Longitude,
    DateTimeOffset Created, string Url, decimal? SalaryMin, decimal? SalaryMax, bool SalaryIsEstimate,
    string Contract, string Time, string? Category, string Snippet, string WorkMode, string Seniority)
{
    public static JobDto From(Job j) => new(
        j.Id, j.Title, j.Company, j.Location, j.Region, j.Latitude, j.Longitude, j.Created, j.Url, j.SalaryMin, j.SalaryMax,
        j.SalaryIsEstimate, j.Contract.ToString(), j.Time.ToString(), j.Category, j.Snippet, j.WorkMode.ToString(), j.Seniority.ToString());
}

public sealed record SalarySummary(decimal? Mean, decimal? P10, decimal? P25, decimal? Median, decimal? P75, decimal? P90);

public sealed record OverviewDto(
    string Country, string Currency, string? What, string? Where, int TotalJobs,
    SalarySummary Salary, List<Bucket> Histogram,
    double RemotePercent, double HybridPercent, double SalaryAdvertisedPercent, int SampleSize,
    List<Share> Contracts, List<Share> Times, List<Share> Seniority,
    List<RegionCount> Regions, List<CompanyStat> Companies, int NewThisWeek, List<JobDto> Latest);

public sealed record JobsPageDto(int Total, int Page, int PageSize, int Pages, string Currency, List<JobDto> Jobs);

public sealed record CompareItem(
    string Query, int TotalJobs, SalarySummary Salary, double RemotePercent, double HybridPercent,
    List<Share> Seniority, string? TopRegion, string? TopCompany);

public sealed record CompareDto(string Country, string Currency, string? Where, List<CompareItem> Items);

public sealed record SalaryGroup(string Name, decimal Median, int Jobs);

public sealed record SalariesDto(
    string Country, string Currency, string? What, string? Where, SalarySummary Summary, List<Bucket> Histogram,
    string? CategoryLabel, List<MonthValue> History, List<SalaryGroup> BySeniority, List<SalaryGroup> ByRegion,
    List<CompanyStat> TopPayingCompanies, int SampleWithSalary);

public sealed record CountryItem(
    string Code, string Name, string Currency, int TotalJobs, decimal? MeanSalary, decimal? MeanSalaryEur,
    decimal? MedianSalary, decimal? MedianSalaryEur, double RemotePercent, string? TopRegion);

public sealed record CountriesDto(string? What, string RatesAsOf, List<CountryItem> Items);

public sealed record MapPoint(string Name, double Latitude, double Longitude, int Count, decimal? MedianSalary);

public sealed record MapDto(string Country, string Currency, string? What, string? Where, int TotalJobs, int Sampled, List<MapPoint> Points, List<RegionCount> Regions);
