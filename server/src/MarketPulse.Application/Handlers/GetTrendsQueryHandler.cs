using MediatR;
using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;
using MarketPulse.Application.Queries;

namespace MarketPulse.Application.Handlers;

public class GetTrendsQueryHandler : IRequestHandler<GetTrendsQuery, TrendDataDto>
{
    private readonly IJobMarketProvider _jobMarketProvider;
    private readonly ICacheService _cacheService;

    public GetTrendsQueryHandler(
        IJobMarketProvider jobMarketProvider,
        ICacheService cacheService)
    {
        _jobMarketProvider = jobMarketProvider;
        _cacheService = cacheService;
    }

    public async Task<TrendDataDto> Handle(GetTrendsQuery request, CancellationToken cancellationToken)
    {
        var cacheKey = $"trends:{request.Location}:{request.Category}:{request.Days}";
        
        var cachedTrends = await _cacheService.GetAsync<TrendDataDto>(cacheKey);
        if (cachedTrends != null)
        {
            return cachedTrends;
        }

        // Fetch jobs from external providers
        var allJobs = await _jobMarketProvider.SearchJobsAsync(
            string.Empty,
            request.Location,
            1,
            1000);

        var jobList = allJobs.ToList();

        // Filter by date if needed
        var fromDate = DateTime.UtcNow.AddDays(-request.Days);
        jobList = jobList.Where(j => j.PublishedDate != default(DateTime) && j.PublishedDate >= fromDate).ToList();

        var hiringTrends = jobList
            .Where(j => j.PublishedDate != default(DateTime))
            .GroupBy(j => j.PublishedDate.Date)
            .OrderBy(g => g.Key)
            .Select(g => new TrendPointDto
            {
                Date = g.Key,
                Value = g.Count(),
                Count = g.Count()
            })
            .ToList();

        var salaryTrends = jobList
            .Where(j => j.SalaryRange != null && j.PublishedDate != default(DateTime))
            .GroupBy(j => j.PublishedDate.Date)
            .OrderBy(g => g.Key)
            .Select(g => new TrendPointDto
            {
                Date = g.Key,
                Value = g.Average(j => j.SalaryRange!.AverageSalary),
                Count = g.Count()
            })
            .ToList();

        var trendsByCategory = new Dictionary<string, List<TrendPointDto>>();

        // Trends by employment type
        var employmentTypes = jobList.Select(j => j.EmploymentType).Distinct().Where(e => !string.IsNullOrEmpty(e));
        foreach (var employmentType in employmentTypes)
        {
            var categoryJobs = jobList.Where(j => j.EmploymentType == employmentType && j.PublishedDate != default(DateTime));
            trendsByCategory[$"EmploymentType_{employmentType}"] = categoryJobs
                .GroupBy(j => j.PublishedDate.Date)
                .OrderBy(g => g.Key)
                .Select(g => new TrendPointDto
                {
                    Date = g.Key,
                    Value = g.Count(),
                    Count = g.Count()
                })
                .ToList();
        }

        var result = new TrendDataDto
        {
            HiringTrends = hiringTrends,
            SalaryTrends = salaryTrends,
            TrendsByCategory = trendsByCategory
        };

        await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromHours(24));

        return result;
    }
}

