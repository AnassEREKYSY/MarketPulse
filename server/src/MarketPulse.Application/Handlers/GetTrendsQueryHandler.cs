using MediatR;
using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;
using MarketPulse.Application.Queries;
using MarketPulse.Infrastructure.Repositories;

namespace MarketPulse.Application.Handlers;

public class GetTrendsQueryHandler : IRequestHandler<GetTrendsQuery, TrendDataDto>
{
    private readonly IJobOfferRepository _jobRepository;
    private readonly ICacheService _cacheService;

    public GetTrendsQueryHandler(
        IJobOfferRepository jobRepository,
        ICacheService cacheService)
    {
        _jobRepository = jobRepository;
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

        var allJobs = await _jobRepository.GetAllWithIncludesAsync();
        var jobs = allJobs.AsQueryable();

        if (!string.IsNullOrEmpty(request.Location))
        {
            jobs = jobs.Where(j => j.Location.City.Contains(request.Location) || 
                                   j.Location.Country.Contains(request.Location));
        }

        var fromDate = DateTime.UtcNow.AddDays(-request.Days);
        jobs = jobs.Where(j => j.PublishedDate >= fromDate);

        var jobList = jobs.ToList();

        var hiringTrends = jobList
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
            .Where(j => j.SalaryRange != null)
            .GroupBy(j => j.PublishedDate.Date)
            .OrderBy(g => g.Key)
            .Select(g => new TrendPointDto
            {
                Date = g.Key,
                Value = g.Average(j => j.SalaryRange!.NormalizeToYearly().AverageSalary),
                Count = g.Count()
            })
            .ToList();

        var trendsByCategory = new Dictionary<string, List<TrendPointDto>>();

        // Trends by employment type
        foreach (var employmentType in Enum.GetValues<Domain.Enums.EmploymentType>())
        {
            var categoryJobs = jobList.Where(j => j.EmploymentType == employmentType);
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

