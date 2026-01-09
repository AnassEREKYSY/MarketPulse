using System.Text.Json;
using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;

namespace MarketPulse.Infrastructure.Services;

public class AdzunaJobProvider : IJobMarketProvider
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AdzunaJobProvider> _logger;

    public string ProviderName => "Adzuna";

    public AdzunaJobProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<AdzunaJobProvider> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> IsAvailableAsync()
    {
        try
        {
            var appId = Environment.GetEnvironmentVariable("ADZUNA_APP_ID") ?? _configuration["Adzuna:AppId"];
            var appKey = Environment.GetEnvironmentVariable("ADZUNA_APP_KEY") ?? _configuration["Adzuna:AppKey"];
            return !string.IsNullOrEmpty(appId) && !string.IsNullOrEmpty(appKey);
        }
        catch
        {
            return false;
        }
    }

    public async Task<List<JobOfferDto>> SearchJobsAsync(string query, string? location = null, int page = 1, int pageSize = 50)
    {
        try
        {
            var appId = Environment.GetEnvironmentVariable("ADZUNA_APP_ID") ?? _configuration["Adzuna:AppId"];
            var appKey = Environment.GetEnvironmentVariable("ADZUNA_APP_KEY") ?? _configuration["Adzuna:AppKey"];
            var country = Environment.GetEnvironmentVariable("ADZUNA_COUNTRY") ?? _configuration["Adzuna:Country"] ?? "fr";

            if (string.IsNullOrEmpty(appId) || string.IsNullOrEmpty(appKey))
            {
                _logger.LogWarning("Adzuna API credentials not configured");
                return new List<JobOfferDto>();
            }

            var url = $"https://api.adzuna.com/v1/api/jobs/{country}/search/{page}?" +
                     $"app_id={appId}&app_key={appKey}&" +
                     $"results_per_page={pageSize}&" +
                     $"what={Uri.EscapeDataString(query)}";

            if (!string.IsNullOrEmpty(location))
            {
                url += $"&where={Uri.EscapeDataString(location)}";
            }

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var jsonDoc = JsonDocument.Parse(content);
            var results = jsonDoc.RootElement.GetProperty("results");

            var jobs = new List<JobOfferDto>();

            foreach (var result in results.EnumerateArray())
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
                            Name = result.TryGetProperty("company", out var company) ? company.GetString() ?? "Unknown" : "Unknown"
                        },
                        Location = new LocationDto
                        {
                            Id = Guid.NewGuid(),
                            City = result.TryGetProperty("location", out var loc) ? ExtractCity(loc.GetString() ?? "") : "",
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

            return jobs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching jobs from Adzuna");
            return new List<JobOfferDto>();
        }
    }

    private string ExtractCity(string location)
    {
        var parts = location.Split(',');
        return parts.Length > 0 ? parts[0].Trim() : location;
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

        if (combined.Contains("remote") || combined.Contains("télétravail"))
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

        if (combined.Contains("senior") || combined.Contains("lead") || combined.Contains("principal"))
            return "Senior";
        if (combined.Contains("mid") || combined.Contains("middle"))
            return "Mid";
        if (combined.Contains("junior") || combined.Contains("entry"))
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


