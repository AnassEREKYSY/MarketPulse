using MediatR;
using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;
using MarketPulse.Application.Queries;
using Microsoft.Extensions.Logging;

namespace MarketPulse.Application.Handlers;

public class GetJobStatisticsQueryHandler : IRequestHandler<GetJobStatisticsQuery, JobStatisticsDto>
{
    private readonly IJobMarketProvider _jobMarketProvider;
    private readonly ICacheService _cacheService;
    private readonly ILogger<GetJobStatisticsQueryHandler> _logger;

    public GetJobStatisticsQueryHandler(
        IJobMarketProvider jobMarketProvider,
        ICacheService cacheService,
        ILogger<GetJobStatisticsQueryHandler> logger)
    {
        _jobMarketProvider = jobMarketProvider;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<JobStatisticsDto> Handle(GetJobStatisticsQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var cacheKey = $"stats:jobs:{request.Location}:{request.EmploymentType}:{request.WorkMode}";
            
            var cachedStats = await _cacheService.GetAsync<JobStatisticsDto>(cacheKey);
            if (cachedStats != null)
            {
                return cachedStats;
            }

            // Fetch jobs from external providers (no database needed)
            // Fetch a larger sample to calculate statistics
            var allJobs = await _jobMarketProvider.SearchJobsAsync(
                string.Empty, // Empty query to get all jobs
                request.Location,
                1,
                1000); // Get up to 1000 jobs for statistics

            var jobList = allJobs.ToList();

            // Apply additional filters
            if (!string.IsNullOrEmpty(request.EmploymentType))
            {
                jobList = jobList.Where(j => j.EmploymentType == request.EmploymentType).ToList();
            }

            if (!string.IsNullOrEmpty(request.WorkMode))
            {
                jobList = jobList.Where(j => j.WorkMode == request.WorkMode).ToList();
            }

            var stats = new JobStatisticsDto
            {
                TotalJobs = jobList.Count,
                JobsByEmploymentType = jobList.GroupBy(j => j.EmploymentType ?? "Unknown")
                    .ToDictionary(g => g.Key, g => g.Count()),
                JobsByWorkMode = jobList.GroupBy(j => j.WorkMode ?? "Unknown")
                    .ToDictionary(g => g.Key, g => g.Count()),
                JobsByExperienceLevel = jobList.GroupBy(j => j.ExperienceLevel ?? "Unknown")
                    .ToDictionary(g => g.Key, g => g.Count()),
                TopCompanies = jobList.Where(j => j.Company != null && !string.IsNullOrEmpty(j.Company.Name))
                    .GroupBy(j => j.Company.Name)
                    .OrderByDescending(g => g.Count())
                    .Take(10)
                    .ToDictionary(g => g.Key, g => g.Count()),
                TopLocations = jobList.Where(j => j.Location != null)
                    .GroupBy(j => $"{j.Location.City ?? "Unknown"}, {j.Location.Country ?? "Unknown"}")
                    .OrderByDescending(g => g.Count())
                    .Take(10)
                    .ToDictionary(g => g.Key, g => g.Count()),
                SalaryStatistics = CalculateSalaryStatistics(jobList)
            };

            await _cacheService.SetAsync(cacheKey, stats, TimeSpan.FromHours(24));

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetJobStatisticsQueryHandler: {Message}", ex.Message);
            // Return empty statistics on any error
            return new JobStatisticsDto
            {
                TotalJobs = 0,
                SalaryStatistics = new SalaryStatisticsDto
                {
                    AverageSalary = null,
                    MedianSalary = null,
                    MinSalary = null,
                    MaxSalary = null,
                    AverageSalaryByExperience = new Dictionary<string, decimal>(),
                    AverageSalaryByLocation = new Dictionary<string, decimal>()
                },
                TopLocations = new Dictionary<string, int>(),
                TopCompanies = new Dictionary<string, int>(),
                JobsByEmploymentType = new Dictionary<string, int>(),
                JobsByWorkMode = new Dictionary<string, int>(),
                JobsByExperienceLevel = new Dictionary<string, int>()
            };
        }
    }

    private SalaryStatisticsDto CalculateSalaryStatistics(List<JobOfferDto> jobs)
    {
        var jobsWithSalary = jobs.Where(j => j.SalaryRange != null).ToList();
        
        if (!jobsWithSalary.Any())
        {
            return new SalaryStatisticsDto();
        }

        var salaries = jobsWithSalary.Select(j => j.SalaryRange!.AverageSalary).ToList();
        salaries.Sort();

        return new SalaryStatisticsDto
        {
            AverageSalary = salaries.Average(),
            MedianSalary = salaries.Count % 2 == 0
                ? (salaries[salaries.Count / 2 - 1] + salaries[salaries.Count / 2]) / 2
                : salaries[salaries.Count / 2],
            MinSalary = salaries.Min(),
            MaxSalary = salaries.Max(),
            AverageSalaryByExperience = jobsWithSalary
                .Where(j => !string.IsNullOrEmpty(j.ExperienceLevel))
                .GroupBy(j => j.ExperienceLevel!)
                .ToDictionary(g => g.Key, g => g.Average(j => j.SalaryRange!.AverageSalary)),
            AverageSalaryByLocation = jobsWithSalary
                .Where(j => j.Location != null)
                .GroupBy(j => $"{j.Location!.City ?? "Unknown"}, {j.Location!.Country ?? "Unknown"}")
                .ToDictionary(g => g.Key, g => g.Average(j => j.SalaryRange!.AverageSalary))
        };
    }
}
