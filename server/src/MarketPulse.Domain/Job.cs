namespace MarketPulse.Domain;

public enum WorkMode { Onsite, Hybrid, Remote }
public enum Seniority { Unspecified, Junior, Mid, Senior, Lead }
public enum ContractType { Unspecified, Permanent, Contract }
public enum ContractTime { Unspecified, FullTime, PartTime }

/// <summary>A job ad, normalised from the provider. Salaries are yearly, in the country's currency.</summary>
public sealed record Job(
    string Id,
    string Title,
    string Company,
    string Location,
    string[] Area,
    double? Latitude,
    double? Longitude,
    DateTimeOffset Created,
    string Url,
    decimal? SalaryMin,
    decimal? SalaryMax,
    bool SalaryIsEstimate,
    ContractType Contract,
    ContractTime Time,
    string? Category,
    string? CategoryTag,
    string Snippet,
    WorkMode WorkMode,
    Seniority Seniority)
{
    /// <summary>Midpoint of the advertised range, or the single value when only one bound is known.</summary>
    public decimal? Salary => (SalaryMin, SalaryMax) switch
    {
        ({ } a, { } b) when a > 0 && b > 0 => (a + b) / 2,
        ({ } a, _) when a > 0 => a,
        (_, { } b) when b > 0 => b,
        _ => null,
    };

    /// <summary>The region one level below the country ("Île-de-France", "London"), used for regional splits.</summary>
    public string Region => Area.Length > 1 ? Area[1] : Area.Length == 1 ? Area[0] : "";
}
