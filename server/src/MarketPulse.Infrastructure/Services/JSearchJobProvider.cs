using System.Text.Json;
using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;

namespace MarketPulse.Infrastructure.Services;

public class JSearchJobProvider : IJobMarketProvider
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<JSearchJobProvider> _logger;

    public string ProviderName => "JSearch";

    public JSearchJobProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<JSearchJobProvider> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> IsAvailableAsync()
    {
        try
        {
            var apiKey = Environment.GetEnvironmentVariable("JSEARCH_API_KEY") ?? _configuration["JSearch:ApiKey"];
            return !string.IsNullOrEmpty(apiKey);
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
            var apiKey = Environment.GetEnvironmentVariable("JSEARCH_API_KEY") ?? _configuration["JSearch:ApiKey"];

            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogWarning("JSearch API key not configured");
                return new List<JobOfferDto>();
            }

            var url = "https://jsearch.p.rapidapi.com/search?" +
                     $"query={Uri.EscapeDataString(query)}&" +
                     $"page={page}&" +
                     $"num_pages=1";

            if (!string.IsNullOrEmpty(location))
            {
                url += $"&location={Uri.EscapeDataString(location)}";
            }

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("X-RapidAPI-Key", apiKey);
            request.Headers.Add("X-RapidAPI-Host", "jsearch.p.rapidapi.com");

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var jsonDoc = JsonDocument.Parse(content);
            var results = jsonDoc.RootElement.TryGetProperty("data", out var data) ? data : jsonDoc.RootElement;

            var jobs = new List<JobOfferDto>();

            foreach (var result in results.EnumerateArray())
            {
                try
                {
                    var job = new JobOfferDto
                    {
                        Id = Guid.NewGuid(),
                        Title = result.TryGetProperty("job_title", out var title) ? title.GetString() ?? "" : "",
                        Description = result.TryGetProperty("job_description", out var desc) ? desc.GetString() ?? "" : "",
                        SourceUrl = result.TryGetProperty("job_apply_link", out var urlProp) ? urlProp.GetString() ?? "" : "",
                        PublishedDate = result.TryGetProperty("job_posted_at_datetime_utc", out var posted) && 
                                       DateTime.TryParse(posted.GetString(), out var date) 
                                       ? date : DateTime.UtcNow,
                        Company = new CompanyDto
                        {
                            Id = Guid.NewGuid(),
                            Name = result.TryGetProperty("employer_name", out var employer) ? employer.GetString() ?? "Unknown" : "Unknown",
                            LogoUrl = result.TryGetProperty("employer_logo", out var logo) ? logo.GetString() : null
                        },
                        Location = new LocationDto
                        {
                            Id = Guid.NewGuid(),
                            City = result.TryGetProperty("job_city", out var city) ? city.GetString() ?? "" : "",
                            Region = result.TryGetProperty("job_state", out var state) ? state.GetString() : null,
                            Country = result.TryGetProperty("job_country", out var country) ? country.GetString() ?? "" : "",
                            CountryCode = result.TryGetProperty("job_country", out var cc) ? cc.GetString()?.Substring(0, 2).ToLower() ?? "" : ""
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
                    _logger.LogWarning(ex, "Error parsing job result from JSearch");
                }
            }

            return jobs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching jobs from JSearch");
            return new List<JobOfferDto>();
        }
    }

    private string DetermineEmploymentType(JsonElement result)
    {
        var employmentType = result.TryGetProperty("job_employment_type", out var et) ? et.GetString()?.ToLower() : "";
        return employmentType switch
        {
            "fulltime" or "full-time" => "CDI",
            "parttime" or "part-time" => "CDD",
            "contractor" or "contract" => "Freelance",
            "intern" or "internship" => "Internship",
            _ => "Other"
        };
    }

    private string DetermineWorkMode(JsonElement result)
    {
        var isRemote = result.TryGetProperty("job_is_remote", out var remote) && remote.GetBoolean();
        if (isRemote) return "Remote";

        var description = result.TryGetProperty("job_description", out var desc) ? desc.GetString()?.ToLower() ?? "" : "";
        if (description.Contains("hybrid")) return "Hybrid";
        return "Onsite";
    }

    private string ExtractExperienceLevel(JsonElement result)
    {
        var description = result.TryGetProperty("job_description", out var desc) ? desc.GetString()?.ToLower() ?? "" : "";
        var title = result.TryGetProperty("job_title", out var t) ? t.GetString()?.ToLower() ?? "" : "";
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
        if (!result.TryGetProperty("job_min_salary", out var min) || !result.TryGetProperty("job_max_salary", out var max))
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
            Currency = result.TryGetProperty("job_salary_currency", out var curr) ? curr.GetString() ?? "USD" : "USD",
            Period = "Yearly"
        };
    }
}


