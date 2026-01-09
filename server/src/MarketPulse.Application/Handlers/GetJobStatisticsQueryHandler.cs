using MediatR;
using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;
using MarketPulse.Application.Queries;

namespace MarketPulse.Application.Handlers;

public class GetJobStatisticsQueryHandler : IRequestHandler<GetJobStatisticsQuery, JobStatisticsDto>
{
    private readonly IJobOfferRepository _jobRepository;
    private readonly ICacheService _cacheService;

    public GetJobStatisticsQueryHandler(
        IJobOfferRepository jobRepository,
        ICacheService cacheService)
    {
        _jobRepository = jobRepository;
        _cacheService = cacheService;
    }

    public async Task<JobStatisticsDto> Handle(GetJobStatisticsQuery request, CancellationToken cancellationToken)
    {
        var cacheKey = $"stats:jobs:{request.Location}:{request.EmploymentType}:{request.WorkMode}";
        
        var cachedStats = await _cacheService.GetAsync<JobStatisticsDto>(cacheKey);
        if (cachedStats != null)
        {
            return cachedStats;
        }

        var allJobs = await _jobRepository.GetAllWithIncludesAsync();
        var jobs = allJobs.AsQueryable();

        // Apply filters
        if (!string.IsNullOrEmpty(request.Location))
        {
            jobs = jobs.Where(j => j.Location.City.Contains(request.Location) || 
                                   j.Location.Country.Contains(request.Location));
        }

        if (request.EmploymentType != null)
        {
            var employmentType = Enum.Parse<Domain.Enums.EmploymentType>(request.EmploymentType);
            jobs = jobs.Where(j => j.EmploymentType == employmentType);
        }

        if (request.WorkMode != null)
        {
            var workMode = Enum.Parse<Domain.Enums.WorkMode>(request.WorkMode);
            jobs = jobs.Where(j => j.WorkMode == workMode);
        }

        if (request.FromDate.HasValue)
        {
            jobs = jobs.Where(j => j.PublishedDate >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            jobs = jobs.Where(j => j.PublishedDate <= request.ToDate.Value);
        }

        var jobList = jobs.ToList();

        var stats = new JobStatisticsDto
        {
            TotalJobs = jobList.Count,
            JobsByEmploymentType = jobList.GroupBy(j => j.EmploymentType.ToString())
                .ToDictionary(g => g.Key, g => g.Count()),
            JobsByWorkMode = jobList.GroupBy(j => j.WorkMode.ToString())
                .ToDictionary(g => g.Key, g => g.Count()),
            JobsByExperienceLevel = jobList.GroupBy(j => j.ExperienceLevel)
                .ToDictionary(g => g.Key, g => g.Count()),
            TopCompanies = jobList.GroupBy(j => j.Company.Name)
                .OrderByDescending(g => g.Count())
                .Take(10)
                .ToDictionary(g => g.Key, g => g.Count()),
            TopLocations = jobList.GroupBy(j => $"{j.Location.City}, {j.Location.Country}")
                .OrderByDescending(g => g.Count())
                .Take(10)
                .ToDictionary(g => g.Key, g => g.Count()),
            SalaryStatistics = CalculateSalaryStatistics(jobList)
        };

        await _cacheService.SetAsync(cacheKey, stats, TimeSpan.FromHours(24));

        return stats;
    }

    private SalaryStatisticsDto CalculateSalaryStatistics(List<Domain.Entities.JobOffer> jobs)
    {
        var jobsWithSalary = jobs.Where(j => j.SalaryRange != null).ToList();
        
        if (!jobsWithSalary.Any())
        {
            return new SalaryStatisticsDto();
        }

        var salaries = jobsWithSalary.Select(j => j.SalaryRange!.NormalizeToYearly().AverageSalary).ToList();
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
                .GroupBy(j => j.ExperienceLevel)
                .ToDictionary(g => g.Key, g => g.Average(j => j.SalaryRange!.NormalizeToYearly().AverageSalary)),
            AverageSalaryByLocation = jobsWithSalary
                .GroupBy(j => $"{j.Location.City}, {j.Location.Country}")
                .ToDictionary(g => g.Key, g => g.Average(j => j.SalaryRange!.NormalizeToYearly().AverageSalary))
        };
    }
}

