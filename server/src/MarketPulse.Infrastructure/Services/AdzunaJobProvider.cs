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

    public AdzunaJobProvider(
        ILogger<AdzunaJobProvider> logger)
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
        Console.WriteLine($"[AdzunaJobProvider] SearchJobsAsync called: query={query}, location={location}");
        try
        {
            var appId = Environment.GetEnvironmentVariable("ADZUNA_APP_ID");
            var appKey = Environment.GetEnvironmentVariable("ADZUNA_APP_KEY");
            var country = Environment.GetEnvironmentVariable("ADZUNA_COUNTRY") ?? "fr";

            Console.WriteLine($"[AdzunaJobProvider] AppId present: {!string.IsNullOrWhiteSpace(appId)}, AppKey present: {!string.IsNullOrWhiteSpace(appKey)}");
            _logger.LogInformation("Adzuna SearchJobsAsync called with Query={Query}, Location={Location}, Page={Page}, PageSize={PageSize}", 
                query, location, page, pageSize);
            
            if (string.IsNullOrWhiteSpace(appId) || string.IsNullOrWhiteSpace(appKey))
            {
                _logger.LogError("Adzuna API credentials not configured. ADZUNA_APP_ID={AppId}, ADZUNA_APP_KEY={AppKey}", 
                    string.IsNullOrWhiteSpace(appId) ? "MISSING" : "SET", 
                    string.IsNullOrWhiteSpace(appKey) ? "MISSING" : "SET");
                return new List<JobOfferDto>();
            }
            
            _logger.LogInformation("Adzuna API credentials found. AppId length: {Length}", appId.Length);

            var url =
                $"https://api.adzuna.com/v1/api/jobs/{country}/search/{page}" +
                $"?app_id={appId}" +
                $"&app_key={appKey}" +
                $"&results_per_page={pageSize}" +
                $"&what={Uri.EscapeDataString(query ?? "")}";

            if (!string.IsNullOrWhiteSpace(location))
            {
                url += $"&where={Uri.EscapeDataString(location)}";
            }

            var maskedUrl = url.Replace(appId, "***").Replace(appKey, "***");
            _logger.LogInformation("Adzuna API Request: {Url}", maskedUrl);

            // Use HttpWebRequest instead of HttpClient to bypass encoding issues with 'utf8' charset
            // HttpClient's logging middleware tries to read content as string and fails on 'utf8'
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
                
                // Read response as bytes to avoid encoding issues
                using var responseStream = response.GetResponseStream();
                using var memoryStream = new MemoryStream();
                await responseStream.CopyToAsync(memoryStream);
                var responseBytes = memoryStream.ToArray();
                responseContent = System.Text.Encoding.UTF8.GetString(responseBytes);
            }
            catch (WebException ex) when (ex.Response is HttpWebResponse httpResponse)
            {
                statusCode = httpResponse.StatusCode;
                using var responseStream = httpResponse.GetResponseStream();
                if (responseStream != null)
                {
                    using var memoryStream = new MemoryStream();
                    await responseStream.CopyToAsync(memoryStream);
                    var responseBytes = memoryStream.ToArray();
                    responseContent = System.Text.Encoding.UTF8.GetString(responseBytes);
                }
                else
                {
                    responseContent = "";
                }
                _logger.LogError("Adzuna API Error: {StatusCode} - {Message}", statusCode, ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error making HTTP request to Adzuna API");
                return new List<JobOfferDto>();
            }
            
            if (statusCode != HttpStatusCode.OK)
            {
                _logger.LogError("Adzuna API Error: {StatusCode} - {Content}", statusCode, responseContent);
                return new List<JobOfferDto>();
            }

            _logger.LogInformation("Adzuna API Response Status: {StatusCode}, Content Length: {Length}", statusCode, responseContent.Length);
            
            // Log first 500 chars of response for debugging
            if (responseContent.Length > 500)
            {
                _logger.LogInformation("Adzuna API Response (first 500 chars): {Json}", responseContent.Substring(0, 500));
            }
            else
            {
                _logger.LogInformation("Adzuna API Response: {Json}", responseContent);
            }

            var doc = JsonDocument.Parse(responseContent);
            
            // Log all root properties to understand the response structure
            _logger.LogInformation("Adzuna API Response Root Properties: {Properties}", 
                string.Join(", ", doc.RootElement.EnumerateObject().Select(p => p.Name)));
            
            if (!doc.RootElement.TryGetProperty("results", out var resultsElement))
            {
                _logger.LogWarning("Adzuna API response missing 'results' property. Available properties: {Properties}", 
                    string.Join(", ", doc.RootElement.EnumerateObject().Select(p => p.Name)));
                return new List<JobOfferDto>();
            }
            
            if (resultsElement.ValueKind != JsonValueKind.Array)
            {
                _logger.LogWarning("Adzuna API 'results' property is not an array. Type: {Type}", resultsElement.ValueKind);
                return new List<JobOfferDto>();
            }
            
            var resultsCount = resultsElement.GetArrayLength();
            _logger.LogInformation("Adzuna API returned {Count} results", resultsCount);

            var jobs = new List<JobOfferDto>();

            foreach (var result in resultsElement.EnumerateArray())
            {
                try
                {
                    var job = new JobOfferDto
                    {
                        Id = Guid.NewGuid(),
                        Title = result.TryGetProperty("title", out var title) ? title.GetString() ?? "" : "",
                        Description = result.TryGetProperty("description", out var desc) ? desc.GetString() ?? "" : "",
                        SourceUrl = result.TryGetProperty("redirect_url", out var urlProp) ? urlProp.GetString() ?? "" : "",
                        PublishedDate = result.TryGetProperty("created", out var created) && 
                                       DateTime.TryParse(created.GetString(), out var date) 
                                       ? date : DateTime.UtcNow,
                        Company = new CompanyDto
                        {
                            Id = Guid.NewGuid(),
                            Name = ExtractCompanyName(result)
                        },
                        Location = new LocationDto
                        {
                            Id = Guid.NewGuid(),
                            City = ExtractCity(result, location),
                            Country = country.ToUpper(),
                            CountryCode = country
                        },
                        EmploymentType = DetermineEmploymentType(result),
                        WorkMode = DetermineWorkMode(result),
                        ExperienceLevel = ExtractExperienceLevel(result),
                        SalaryRange = ExtractSalaryRange(result)
                    };

                    jobs.Add(job);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error parsing job result from Adzuna");
                }
            }

            _logger.LogInformation("Successfully parsed {Count} jobs from Adzuna", jobs.Count);
            return jobs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching jobs from Adzuna");
            return new List<JobOfferDto>();
        }
    }

    private string ExtractCompanyName(JsonElement result)
    {
        // Try different property paths
        if (result.TryGetProperty("company", out var company))
        {
            if (company.ValueKind == JsonValueKind.String)
            {
                return company.GetString() ?? "Unknown";
            }
            if (company.TryGetProperty("display_name", out var displayName))
            {
                return displayName.GetString() ?? "Unknown";
            }
            if (company.TryGetProperty("name", out var name))
            {
                return name.GetString() ?? "Unknown";
            }
        }
        return "Unknown";
    }

    private string ExtractCity(JsonElement result, string? fallbackLocation)
    {
        if (result.TryGetProperty("location", out var location))
        {
            if (location.ValueKind == JsonValueKind.String)
            {
                var locStr = location.GetString() ?? "";
                return locStr.Split(',')[0].Trim();
            }
            if (location.TryGetProperty("display_name", out var displayName))
            {
                var locStr = displayName.GetString() ?? "";
                return locStr.Split(',')[0].Trim();
            }
            if (location.TryGetProperty("area", out var area))
            {
                return area.GetString() ?? "";
            }
        }
        return fallbackLocation?.Split(',')[0].Trim() ?? "";
    }

    private string DetermineEmploymentType(JsonElement result)
    {
        var contractType = result.TryGetProperty("contract_type", out var ct) ? ct.GetString()?.ToLower() : "";
        return contractType switch
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
        var description = result.TryGetProperty("description", out var desc) ? desc.GetString()?.ToLower() ?? "" : "";
        var title = result.TryGetProperty("title", out var t) ? t.GetString()?.ToLower() ?? "" : "";
        var combined = $"{title} {description}";

        if (combined.Contains("remote") || combined.Contains("télétravail") || combined.Contains("travail à distance"))
            return "Remote";
        if (combined.Contains("hybrid") || combined.Contains("hybride"))
            return "Hybrid";
        return "Onsite";
    }

    private string ExtractExperienceLevel(JsonElement result)
    {
        var description = result.TryGetProperty("description", out var desc) ? desc.GetString()?.ToLower() ?? "" : "";
        var title = result.TryGetProperty("title", out var t) ? t.GetString()?.ToLower() ?? "" : "";
        var combined = $"{title} {description}";

        if (combined.Contains("senior") || combined.Contains("lead") || combined.Contains("principal") || combined.Contains("expert"))
            return "Senior";
        if (combined.Contains("mid") || combined.Contains("middle") || combined.Contains("intermediate"))
            return "Mid";
        if (combined.Contains("junior") || combined.Contains("entry") || combined.Contains("débutant"))
            return "Junior";
        return "Any";
    }

    private SalaryRangeDto? ExtractSalaryRange(JsonElement result)
    {
        if (!result.TryGetProperty("salary_min", out var min) || !result.TryGetProperty("salary_max", out var max))
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
            Currency = result.TryGetProperty("salary_is_predicted", out var pred) && pred.GetInt32() == 1 ? "EUR" : "EUR",
            Period = "Yearly"
        };
    }
}
