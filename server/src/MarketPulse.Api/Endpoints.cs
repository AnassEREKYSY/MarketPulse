using MarketPulse.Application;
using MarketPulse.Domain;
using MarketPulse.Infrastructure;

namespace MarketPulse.Api;

public static class Endpoints
{
    public static void MapMarketApi(this WebApplication app)
    {
        var api = app.MapGroup("/api");
        // Data changes slowly and every answer is cached server-side: let browsers keep it a few minutes too.
        api.AddEndpointFilter(async (ctx, next) =>
        {
            var result = await next(ctx);
            if (ctx.HttpContext.Request.Path != "/api/health") ctx.HttpContext.Response.Headers.CacheControl = "private, max-age=300";
            return result;
        });

        api.MapGet("/health", (AdzunaOptions o, QuotaGuard q) => new { ok = true, dataConfigured = o.Configured, callsToday = q.UsedToday, dailyLimit = q.DailyLimit });

        api.MapGet("/countries", () => Countries.All.Select(c => new CountryDto(c.Code, c.Name, c.Currency, c.EurRate)));

        api.MapGet("/categories", (string? country, MarketService s, CancellationToken ct) => s.CategoriesAsync(country ?? "fr", ct));

        api.MapGet("/overview", (string? country, string? what, string? where, MarketService s, CancellationToken ct) =>
            s.OverviewAsync(country ?? "fr", what, where, ct));

        api.MapGet("/jobs", (string? country, string? what, string? where, int? page, int? pageSize, string? sort, int? maxDaysOld,
            int? salaryMin, string? contract, string? time, string? workMode, string? category, MarketService s, CancellationToken ct) =>
            s.JobsAsync(new JobsQuery(country ?? "fr", what, where, page ?? 1, pageSize ?? 20,
                Parse(sort, SortBy.Relevance), maxDaysOld is > 0 and <= 365 ? maxDaysOld : null, salaryMin is > 0 ? salaryMin : null,
                Parse(contract, ContractType.Unspecified), Parse(time, ContractTime.Unspecified),
                string.IsNullOrWhiteSpace(workMode) ? null : Parse(workMode, WorkMode.Onsite) is var w && w != WorkMode.Onsite ? w : null,
                category), ct));

        api.MapGet("/compare", (string? country, string? where, string[]? q, MarketService s, CancellationToken ct) =>
            s.CompareAsync(country ?? "fr", where, q ?? [], ct));

        api.MapGet("/salaries", (string? country, string? what, string? where, MarketService s, CancellationToken ct) =>
            s.SalariesAsync(country ?? "fr", what, where, ct));

        api.MapGet("/countries/compare", (string? what, string? codes, MarketService s, CancellationToken ct) =>
            s.CountriesAsync(what, (codes ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries), ct));

        api.MapGet("/map", (string? country, string? what, string? where, MarketService s, CancellationToken ct) =>
            s.MapAsync(country ?? "fr", what, where, ct));
    }

    static T Parse<T>(string? value, T fallback) where T : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(value)) return fallback;
        var v = value.Replace("_", "").Replace("-", "");
        return Enum.TryParse<T>(v, ignoreCase: true, out var r) && Enum.IsDefined(r) ? r : throw new MarketException(400, $"Unknown value \"{value}\".");
    }
}
