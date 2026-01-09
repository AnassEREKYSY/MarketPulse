using MediatR;
using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;
using MarketPulse.Application.Queries;
using MarketPulse.Infrastructure.Repositories;

namespace MarketPulse.Application.Handlers;

public class GetSalaryAnalyticsQueryHandler : IRequestHandler<GetSalaryAnalyticsQuery, SalaryStatisticsDto>
{
    private readonly IJobOfferRepository _jobRepository;
    private readonly ICacheService _cacheService;

    public GetSalaryAnalyticsQueryHandler(
        IJobOfferRepository jobRepository,
        ICacheService cacheService)
    {
        _jobRepository = jobRepository;
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

        var allJobs = await _jobRepository.GetAllWithIncludesAsync();
        var jobs = allJobs.AsQueryable();

        if (!string.IsNullOrEmpty(request.Location))
        {
            jobs = jobs.Where(j => j.Location.City.Contains(request.Location) || 
                                   j.Location.Country.Contains(request.Location));
        }

        if (!string.IsNullOrEmpty(request.ExperienceLevel))
        {
            jobs = jobs.Where(j => j.ExperienceLevel == request.ExperienceLevel);
        }

        if (!string.IsNullOrEmpty(request.EmploymentType))
        {
            var employmentType = Enum.Parse<Domain.Enums.EmploymentType>(request.EmploymentType);
            jobs = jobs.Where(j => j.EmploymentType == employmentType);
        }

        var jobList = jobs.Where(j => j.SalaryRange != null).ToList();

        if (!jobList.Any())
        {
            return new SalaryStatisticsDto();
        }

        var salaries = jobList.Select(j => j.SalaryRange!.NormalizeToYearly().AverageSalary).ToList();
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
                .GroupBy(j => j.ExperienceLevel)
                .ToDictionary(g => g.Key, g => g.Average(j => j.SalaryRange!.NormalizeToYearly().AverageSalary)),
            AverageSalaryByLocation = jobList
                .GroupBy(j => $"{j.Location.City}, {j.Location.Country}")
                .ToDictionary(g => g.Key, g => g.Average(j => j.SalaryRange!.NormalizeToYearly().AverageSalary))
        };

        await _cacheService.SetAsync(cacheKey, analytics, TimeSpan.FromHours(24));

        return analytics;
    }
}

