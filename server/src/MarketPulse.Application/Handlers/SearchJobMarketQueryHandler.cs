using MediatR;
using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;
using MarketPulse.Application.Queries;

namespace MarketPulse.Application.Handlers;

public class SearchJobMarketQueryHandler : IRequestHandler<SearchJobMarketQuery, SearchJobMarketResult>
{
    private readonly IJobMarketProvider _jobMarketProvider;
    private readonly ICacheService _cacheService;

    public SearchJobMarketQueryHandler(
        IJobMarketProvider jobMarketProvider,
        ICacheService cacheService)
    {
        _jobMarketProvider = jobMarketProvider;
        _cacheService = cacheService;
    }

    public async Task<SearchJobMarketResult> Handle(SearchJobMarketQuery request, CancellationToken cancellationToken)
    {
        var cacheKey = $"jobs:search:{request.Query}:{request.Location}:{request.Page}:{request.PageSize}";
        
        var cachedResult = await _cacheService.GetAsync<SearchJobMarketResult>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var jobs = await _jobMarketProvider.SearchJobsAsync(
            request.Query ?? string.Empty,
            request.Location,
            request.Page,
            request.PageSize);

        // Apply filters
        var filteredJobs = jobs.AsEnumerable();

        if (!string.IsNullOrEmpty(request.EmploymentType))
        {
            filteredJobs = filteredJobs.Where(j => j.EmploymentType == request.EmploymentType);
        }

        if (!string.IsNullOrEmpty(request.WorkMode))
        {
            filteredJobs = filteredJobs.Where(j => j.WorkMode == request.WorkMode);
        }

        if (!string.IsNullOrEmpty(request.ExperienceLevel))
        {
            filteredJobs = filteredJobs.Where(j => j.ExperienceLevel == request.ExperienceLevel);
        }

        if (request.MinSalary.HasValue)
        {
            filteredJobs = filteredJobs.Where(j => j.SalaryRange != null && j.SalaryRange.AverageSalary >= request.MinSalary.Value);
        }

        if (request.MaxSalary.HasValue)
        {
            filteredJobs = filteredJobs.Where(j => j.SalaryRange != null && j.SalaryRange.AverageSalary <= request.MaxSalary.Value);
        }

        var jobList = filteredJobs.ToList();
        var result = new SearchJobMarketResult
        {
            Jobs = jobList.Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).ToList(),
            TotalCount = jobList.Count,
            Page = request.Page,
            PageSize = request.PageSize
        };

        await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromHours(6));

        return result;
    }
}

