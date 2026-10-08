using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using MarketPulse.Application;
using MarketPulse.Domain;
using Microsoft.Extensions.Logging;

namespace MarketPulse.Infrastructure;

/// <summary>Adzuna API client (https://developer.adzuna.com/docs). Every call counts against the daily quota.</summary>
public sealed partial class AdzunaJobMarket(HttpClient http, AdzunaOptions options, QuotaGuard quota, ILogger<AdzunaJobMarket> log) : IJobMarket
{
    public async Task<SearchPage> SearchAsync(SearchRequest r, CancellationToken ct)
    {
        var q = new List<(string, string?)>
        {
            ("results_per_page", Math.Clamp(r.PageSize, 1, 50).ToString(CultureInfo.InvariantCulture)),
            ("what", r.What), ("where", r.Where), ("category", r.Category),
            ("sort_by", r.Sort switch { SortBy.Date => "date", SortBy.Salary => "salary", _ => null }),
            ("max_days_old", r.MaxDaysOld?.ToString(CultureInfo.InvariantCulture)),
            ("salary_min", r.SalaryMin?.ToString(CultureInfo.InvariantCulture)),
            (r.Contract switch { ContractType.Permanent => "permanent", ContractType.Contract => "contract", _ => "" }, r.Contract == ContractType.Unspecified ? null : "1"),
            (r.Time switch { ContractTime.FullTime => "full_time", ContractTime.PartTime => "part_time", _ => "" }, r.Time == ContractTime.Unspecified ? null : "1"),
        };
        var root = await GetAsync($"jobs/{r.Country}/search/{Math.Max(1, r.Page)}", q, ct);
        var jobs = root.TryGetProperty("results", out var results) && results.ValueKind == JsonValueKind.Array
            ? results.EnumerateArray().Select(ParseJob).OfType<Job>().ToList()
            : [];
        return new SearchPage(Int(root, "count") ?? jobs.Count, Dec(root, "mean"), jobs);
    }

    public async Task<List<Bucket>> HistogramAsync(string country, string? what, string? where, CancellationToken ct)
    {
        var root = await GetAsync($"jobs/{country}/histogram", [("what", what), ("where", where)], ct);
        if (!root.TryGetProperty("histogram", out var h) || h.ValueKind != JsonValueKind.Object) return [];
        return Stats.ToBuckets(h.EnumerateObject()
            .Where(p => decimal.TryParse(p.Name, NumberStyles.Number, CultureInfo.InvariantCulture, out _) && p.Value.ValueKind == JsonValueKind.Number)
            .Select(p => new KeyValuePair<decimal, int>(decimal.Parse(p.Name, CultureInfo.InvariantCulture), p.Value.GetInt32())));
    }

    public async Task<List<MonthValue>> SalaryHistoryAsync(string country, string? category, string? where, int months, CancellationToken ct)
    {
        var root = await GetAsync($"jobs/{country}/history", [("category", category), ("months", months.ToString(CultureInfo.InvariantCulture))], ct);
        if (!root.TryGetProperty("month", out var m) || m.ValueKind != JsonValueKind.Object) return [];
        return m.EnumerateObject().Where(p => p.Value.ValueKind == JsonValueKind.Number)
            .Select(p => new MonthValue(p.Name, Math.Round(p.Value.GetDecimal(), 0))).OrderBy(x => x.Month, StringComparer.Ordinal).ToList();
    }

    public async Task<List<RegionCount>> RegionsAsync(string country, string? what, string? where, CancellationToken ct)
    {
        var root = await GetAsync($"jobs/{country}/geodata", [("what", what), ("where", where)], ct);
        if (!root.TryGetProperty("locations", out var l) || l.ValueKind != JsonValueKind.Array) return [];
        return l.EnumerateArray()
            .Select(x => new RegionCount(
                x.TryGetProperty("location", out var loc) ? Str(loc, "display_name") ?? "" : "",
                Int(x, "count") ?? 0))
            .Where(x => x.Name != "" && x.Count > 0).OrderByDescending(x => x.Count).ToList();
    }

    public async Task<List<CompanyStat>> TopCompaniesAsync(string country, string? what, string? where, CancellationToken ct)
    {
        var root = await GetAsync($"jobs/{country}/top_companies", [("what", what), ("where", where)], ct);
        if (!root.TryGetProperty("leaderboard", out var l) || l.ValueKind != JsonValueKind.Array) return [];
        return l.EnumerateArray()
            .Select(x => new CompanyStat(Str(x, "canonical_name") ?? "", Int(x, "count") ?? 0, Dec(x, "average_salary") is { } s && s > 0 ? Math.Round(s, 0) : null))
            .Where(x => x.Name != "").ToList();
    }

    public async Task<List<Category>> CategoriesAsync(string country, CancellationToken ct)
    {
        var root = await GetAsync($"jobs/{country}/categories", [], ct);
        if (!root.TryGetProperty("results", out var l) || l.ValueKind != JsonValueKind.Array) return [];
        return l.EnumerateArray().Select(x => new Category(Str(x, "tag") ?? "", Str(x, "label") ?? ""))
            .Where(x => x.Tag != "" && x.Tag != "unknown").OrderBy(x => x.Label, StringComparer.OrdinalIgnoreCase).ToList();
    }

    // HTTP ---------------------------------------------------------------------

    private async Task<JsonElement> GetAsync(string path, IEnumerable<(string Key, string? Value)> query, CancellationToken ct)
    {
        if (!options.Configured) throw new MarketException(503, "Job data is not configured on the server (ADZUNA_APP_ID and ADZUNA_APP_KEY).");
        quota.Take();

        var qs = string.Join('&', new[] { ("app_id", (string?)options.AppId), ("app_key", options.AppKey) }.Concat(query)
            .Where(p => p.Item1 != "" && !string.IsNullOrWhiteSpace(p.Item2))
            .Select(p => $"{p.Item1}={Uri.EscapeDataString(p.Item2!)}"));
        using var req = new HttpRequestMessage(HttpMethod.Get, $"{options.BaseUrl}/{path}?{qs}");
        req.Headers.Accept.ParseAdd("application/json");

        HttpResponseMessage res;
        using var turn = await quota.TurnAsync(ct);
        try { res = await http.SendAsync(req, ct); }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested) { throw new MarketException(504, "The job data provider took too long to answer. Please try again."); }
        catch (HttpRequestException e)
        {
            log.LogWarning(e, "Adzuna unreachable for {Path}", path);
            throw new MarketException(503, "The job data provider cannot be reached right now. Please try again shortly.");
        }

        using (res)
        {
            var body = await res.Content.ReadAsStringAsync(ct);
            if (!res.IsSuccessStatusCode)
            {
                // Never log the URL: it contains the API key.
                log.LogWarning("Adzuna {Status} on {Path}: {Body}", (int)res.StatusCode, path, body.Length > 300 ? body[..300] : body);
                if (res.StatusCode == HttpStatusCode.TooManyRequests)
                    quota.CoolDown(res.Headers.RetryAfter?.Delta is { } ra && ra > TimeSpan.Zero ? ra : TimeSpan.FromSeconds(15));
                throw res.StatusCode switch
                {
                    HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => new MarketException(502, "The job data provider refused the API key. Check ADZUNA_APP_ID and ADZUNA_APP_KEY."),
                    HttpStatusCode.TooManyRequests => new MarketException(429, "The job data provider's limit is reached. Results already loaded still work; please try new searches later."),
                    HttpStatusCode.BadRequest or HttpStatusCode.NotFound => new MarketException(400, "The job data provider could not run this search. Try simpler terms or another location."),
                    _ => new MarketException(503, "The job data provider had a problem. Please try again shortly."),
                };
            }
            try { return JsonDocument.Parse(body).RootElement.Clone(); }
            catch (JsonException) { throw new MarketException(503, "The job data provider sent an unreadable answer. Please try again."); }
        }
    }

    // Parsing --------------------------------------------------------------------

    internal static Job? ParseJob(JsonElement r)
    {
        if (r.ValueKind != JsonValueKind.Object) return null;
        var title = Text(Str(r, "title"));
        if (title == "") return null;
        var description = Text(Str(r, "description"));
        var loc = r.TryGetProperty("location", out var l) && l.ValueKind == JsonValueKind.Object ? l : default;
        var area = loc.ValueKind == JsonValueKind.Object && loc.TryGetProperty("area", out var a) && a.ValueKind == JsonValueKind.Array
            ? a.EnumerateArray().Select(x => x.GetString() ?? "").Where(x => x != "").ToArray() : [];
        var company = r.TryGetProperty("company", out var c) && c.ValueKind == JsonValueKind.Object ? Text(Str(c, "display_name")) : "";
        var category = r.TryGetProperty("category", out var cat) && cat.ValueKind == JsonValueKind.Object ? cat : default;
        var min = Dec(r, "salary_min"); var max = Dec(r, "salary_max");
        return new Job(
            Id: Str(r, "id") ?? Int(r, "id")?.ToString(CultureInfo.InvariantCulture) ?? Guid.NewGuid().ToString("N"),
            Title: title,
            Company: company == "" ? "Company not shown" : company,
            Location: loc.ValueKind == JsonValueKind.Object ? Text(Str(loc, "display_name")) : "",
            Area: area,
            Latitude: Dbl(r, "latitude"),
            Longitude: Dbl(r, "longitude"),
            Created: DateTimeOffset.TryParse(Str(r, "created"), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var d) ? d : DateTimeOffset.MinValue,
            Url: Str(r, "redirect_url") ?? "",
            SalaryMin: min is > 0 ? Math.Round(min.Value, 0) : null,
            SalaryMax: max is > 0 ? Math.Round(max.Value, 0) : null,
            // "salary_is_predicted": "1" means Adzuna estimated it; the ad itself gave no salary.
            SalaryIsEstimate: (Str(r, "salary_is_predicted") ?? Int(r, "salary_is_predicted")?.ToString(CultureInfo.InvariantCulture)) == "1",
            Contract: Classifier.ContractOf(Str(r, "contract_type")),
            Time: Classifier.TimeOf(Str(r, "contract_time")),
            Category: category.ValueKind == JsonValueKind.Object ? Str(category, "label") : null,
            CategoryTag: category.ValueKind == JsonValueKind.Object ? Str(category, "tag") : null,
            Snippet: description.Length > 280 ? description[..277].TrimEnd() + "…" : description,
            WorkMode: Classifier.WorkModeOf(title, description),
            Seniority: Classifier.SeniorityOf(title, description));
    }

    [GeneratedRegex("<[^>]+>")] private static partial Regex Tags();
    [GeneratedRegex(@"\s+")] private static partial Regex Spaces();

    /// <summary>Adzuna highlights matches with &lt;strong&gt; and sends HTML entities.</summary>
    internal static string Text(string? s) => s is null ? "" : Spaces().Replace(WebUtility.HtmlDecode(Tags().Replace(s, "")), " ").Trim();

    static string? Str(JsonElement e, string p) => e.TryGetProperty(p, out var v) ? v.ValueKind switch
    {
        JsonValueKind.String => v.GetString(),
        JsonValueKind.Number => v.GetRawText(),
        _ => null,
    } : null;
    static int? Int(JsonElement e, string p) => e.TryGetProperty(p, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt64(out var n) ? (int)Math.Min(n, int.MaxValue) : null;
    static decimal? Dec(JsonElement e, string p) => e.TryGetProperty(p, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetDecimal() : null;
    static double? Dbl(JsonElement e, string p) => e.TryGetProperty(p, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetDouble() : null;
}
