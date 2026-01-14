using System.Text.Json;
using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;
using Microsoft.Extensions.Logging;
using System.IO;
using System.Net;

namespace MarketPulse.Infrastructure.Services;

public class AdzunaJobProvider : IJobMarketProvider
{
    private readonly ILogger<AdzunaJobProvider> _logger;

    public string ProviderName => "Adzuna";

    public AdzunaJobProvider(ILogger<AdzunaJobProvider> logger)
    {
        _logger = logger;
    }

    public Task<bool> IsAvailableAsync()
    {
        var appId = Environment.GetEnvironmentVariable("ADZUNA_APP_ID");
        var appKey = Environment.GetEnvironmentVariable("ADZUNA_APP_KEY");

        return Task.FromResult(
            !string.IsNullOrWhiteSpace(appId) &&
            !string.IsNullOrWhiteSpace(appKey)
        );
    }

    public async Task<List<JobOfferDto>> SearchJobsAsync(
        string query,
        string? location = null,
        int page = 1,
        int pageSize = 50)
    {
        if (string.IsNullOrWhiteSpace(query))
            return new List<JobOfferDto>();

        var appId = Environment.GetEnvironmentVariable("ADZUNA_APP_ID");
        var appKey = Environment.GetEnvironmentVariable("ADZUNA_APP_KEY");
        var country = Environment.GetEnvironmentVariable("ADZUNA_COUNTRY") ?? "fr";

        if (string.IsNullOrWhiteSpace(appId) || string.IsNullOrWhiteSpace(appKey))
        {
            _logger.LogError("Adzuna credentials are missing. Check ADZUNA_APP_ID / ADZUNA_APP_KEY environment variables.");
            return new List<JobOfferDto>();
        }

        var url =
            $"https://api.adzuna.com/v1/api/jobs/{country}/search/{page}" +
            $"?app_id={appId}" +
            $"&app_key={appKey}" +
            $"&results_per_page={pageSize}" +
            $"&what={Uri.EscapeDataString(query)}";

        if (!string.IsNullOrWhiteSpace(location))
            url += $"&where={Uri.EscapeDataString(location)}";

        _logger.LogInformation("Adzuna request sent (credentials hidden)");

        string responseContent;
        HttpStatusCode statusCode;

        try
        {
            var request = (HttpWebRequest)WebRequest.Create(url);
            request.Method = "GET";
            request.Timeout = 30000;
            request.Accept = "application/json";

            using var response = (HttpWebResponse)await request.GetResponseAsync();
            statusCode = response.StatusCode;

            using var stream = response.GetResponseStream();
            using var memory = new MemoryStream();
            await stream!.CopyToAsync(memory);
            responseContent = System.Text.Encoding.UTF8.GetString(memory.ToArray());
        }
        catch (WebException ex) when (ex.Response is HttpWebResponse httpResponse)
        {
            statusCode = httpResponse.StatusCode;

            using var stream = httpResponse.GetResponseStream();
            using var memory = new MemoryStream();
            if (stream != null)
                await stream.CopyToAsync(memory);

            responseContent = System.Text.Encoding.UTF8.GetString(memory.ToArray());

            _logger.LogError(
                "Adzuna HTTP error {Status}. Response: {Body}",
                (int)statusCode,
                Truncate(responseContent, 300)
            );

            return new List<JobOfferDto>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Adzuna request failed");
            return new List<JobOfferDto>();
        }

        if (statusCode != HttpStatusCode.OK)
        {
            _logger.LogError(
                "Adzuna returned non-OK status {Status}. Response: {Body}",
                (int)statusCode,
                Truncate(responseContent, 300)
            );
            return new List<JobOfferDto>();
        }

        using var doc = JsonDocument.Parse(responseContent);

        if (!doc.RootElement.TryGetProperty("results", out var results) ||
            results.ValueKind != JsonValueKind.Array)
        {
            _logger.LogWarning("Adzuna response has no results array");
            return new List<JobOfferDto>();
        }

        var jobs = new List<JobOfferDto>();

        foreach (var result in results.EnumerateArray())
        {
            jobs.Add(new JobOfferDto
            {
                Id = Guid.NewGuid(),
                Title = result.TryGetProperty("title", out var title) ? title.GetString() ?? "" : "",
                Description = result.TryGetProperty("description", out var desc) ? desc.GetString() ?? "" : "",
                SourceUrl = result.TryGetProperty("redirect_url", out var link) ? link.GetString() ?? "" : "",
                PublishedDate = result.TryGetProperty("created", out var created) &&
                               DateTime.TryParse(created.GetString(), out var date)
                    ? date
                    : DateTime.UtcNow,
                Company = new CompanyDto
                {
                    Id = Guid.NewGuid(),
                    Name = ExtractCompanyName(result)
                },
                Location = ExtractLocation(result, location, country),
                EmploymentType = DetermineEmploymentType(result),
                WorkMode = DetermineWorkMode(result),
                ExperienceLevel = ExtractExperienceLevel(result),
                SalaryRange = ExtractSalaryRange(result)
            });
        }

        _logger.LogInformation("Adzuna returned {Count} jobs", jobs.Count);
        return jobs;
    }

    private static string Truncate(string value, int max)
        => string.IsNullOrEmpty(value) ? value : (value.Length <= max ? value : value[..max]);

    private string ExtractCompanyName(JsonElement result)
    {
        if (result.TryGetProperty("company", out var company))
        {
            if (company.ValueKind == JsonValueKind.String)
                return company.GetString() ?? "Unknown";

            if (company.ValueKind == JsonValueKind.Object)
            {
                if (company.TryGetProperty("display_name", out var dn))
                    return dn.GetString() ?? "Unknown";

                if (company.TryGetProperty("name", out var n))
                    return n.GetString() ?? "Unknown";
            }
        }
        return "Unknown";
    }

    private LocationDto ExtractLocation(JsonElement result, string? fallback, string country)
    {
        var city = ExtractCity(result, fallback);

        return new LocationDto
        {
            Id = Guid.NewGuid(),
            City = city,
            Country = country.ToUpper(),
            CountryCode = country
        };
    }

    private string ExtractCity(JsonElement result, string? fallback)
    {
        if (result.TryGetProperty("location", out var loc))
        {
            if (loc.ValueKind == JsonValueKind.Object)
            {
                if (loc.TryGetProperty("display_name", out var dn))
                    return dn.GetString()!.Split(',')[0].Trim();

                if (loc.TryGetProperty("area", out var area) &&
                    area.ValueKind == JsonValueKind.Array &&
                    area.GetArrayLength() > 0)
                    return area[0].GetString()?.Trim() ?? fallback ?? "";
            }

            if (loc.ValueKind == JsonValueKind.String)
                return loc.GetString()!.Split(',')[0].Trim();
        }

        return fallback?.Split(',')[0].Trim() ?? "";
    }

    private string DetermineEmploymentType(JsonElement result)
    {
        var type = result.TryGetProperty("contract_type", out var ct)
            ? ct.GetString()?.ToLower()
            : "";

        return type switch
        {
            "full_time" or "permanent" => "CDI",
            "part_time" or "contract" => "CDD",
            "freelance" => "Freelance",
            "internship" => "Internship",
            _ => "Other"
        };
    }

    private string DetermineWorkMode(JsonElement result)
    {
        var title = result.TryGetProperty("title", out var t) ? t.GetString()?.ToLower() ?? "" : "";
        var desc = result.TryGetProperty("description", out var d) ? d.GetString()?.ToLower() ?? "" : "";
        var text = $"{title} {desc}";

        if (text.Contains("remote") || text.Contains("teletravail") || text.Contains("télétravail"))
            return "Remote";
        if (text.Contains("hybrid") || text.Contains("hybride"))
            return "Hybrid";
        return "Onsite";
    }

    private string ExtractExperienceLevel(JsonElement result)
    {
        var title = result.TryGetProperty("title", out var t) ? t.GetString()?.ToLower() ?? "" : "";
        var desc = result.TryGetProperty("description", out var d) ? d.GetString()?.ToLower() ?? "" : "";
        var text = $"{title} {desc}";

        if (text.Contains("senior") || text.Contains("lead") || text.Contains("expert"))
            return "Senior";
        if (text.Contains("junior") || text.Contains("entry"))
            return "Junior";
        if (text.Contains("mid") || text.Contains("intermediate"))
            return "Mid";

        return "Any";
    }

    private SalaryRangeDto? ExtractSalaryRange(JsonElement result)
    {
        if (!result.TryGetProperty("salary_min", out var min) ||
            !result.TryGetProperty("salary_max", out var max) ||
            min.ValueKind != JsonValueKind.Number ||
            max.ValueKind != JsonValueKind.Number)
            return null;

        var minVal = min.GetDecimal();
        var maxVal = max.GetDecimal();

        if (minVal == 0 && maxVal == 0)
            return null;

        return new SalaryRangeDto
        {
            MinSalary = minVal,
            MaxSalary = maxVal,
            AverageSalary = (minVal + maxVal) / 2,
            Currency = "EUR",
            Period = "Yearly"
        };
    }
}
