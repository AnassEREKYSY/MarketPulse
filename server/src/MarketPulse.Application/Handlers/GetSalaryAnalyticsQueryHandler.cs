using MediatR;
using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;
using MarketPulse.Application.Queries;

namespace MarketPulse.Application.Handlers;

public class GetSalaryAnalyticsQueryHandler : IRequestHandler<GetSalaryAnalyticsQuery, SalaryStatisticsDto>
{
    private readonly IJobMarketProvider _jobMarketProvider;
    private readonly ICacheService _cacheService;

    public GetSalaryAnalyticsQueryHandler(
        IJobMarketProvider jobMarketProvider,
        ICacheService cacheService)
    {
        _jobMarketProvider = jobMarketProvider;
        _cacheService = cacheService;
    }

    public async Task<SalaryStatisticsDto> Handle(GetSalaryAnalyticsQuery request, CancellationToken cancellationToken)
    {
        var cacheKey = $"analytics:salary:{request.Location}:{request.ExperienceLevel}:{request.EmploymentType}";
        
        var cachedAnalytics = await _cacheService.GetAsync<SalaryStatisticsDto>(cacheKey);
        if (cachedAnalytics != null)
        {
            return cachedAnalytics;
        }

        // Fetch jobs from external providers
        var allJobs = await _jobMarketProvider.SearchJobsAsync(
            string.Empty,
            request.Location,
            1,
            1000);

        var jobList = allJobs.Where(j => j.SalaryRange != null).ToList();

        // Apply filters
        if (!string.IsNullOrEmpty(request.ExperienceLevel))
        {
            jobList = jobList.Where(j => j.ExperienceLevel == request.ExperienceLevel).ToList();
        }

        if (!string.IsNullOrEmpty(request.EmploymentType))
        {
            jobList = jobList.Where(j => j.EmploymentType == request.EmploymentType).ToList();
        }

        if (!jobList.Any())
        {
            return new SalaryStatisticsDto();
        }

        var salaries = jobList.Select(j => j.SalaryRange!.AverageSalary).ToList();
        salaries.Sort();

        var analytics = new SalaryStatisticsDto
        {
            AverageSalary = salaries.Average(),
            MedianSalary = salaries.Count % 2 == 0
                ? (salaries[salaries.Count / 2 - 1] + salaries[salaries.Count / 2]) / 2
                : salaries[salaries.Count / 2],
            MinSalary = salaries.Min(),
            MaxSalary = salaries.Max(),
            AverageSalaryByExperience = jobList
                .Where(j => !string.IsNullOrEmpty(j.ExperienceLevel))
                .GroupBy(j => j.ExperienceLevel!)
                .ToDictionary(g => g.Key, g => g.Average(j => j.SalaryRange!.AverageSalary)),
            AverageSalaryByLocation = jobList
                .Where(j => j.Location != null)
                .GroupBy(j => $"{j.Location!.City ?? "Unknown"}, {j.Location!.Country ?? "Unknown"}")
                .ToDictionary(g => g.Key, g => g.Average(j => j.SalaryRange!.AverageSalary))
        };

        await _cacheService.SetAsync(cacheKey, analytics, TimeSpan.FromHours(24));

        return analytics;
    }
}

