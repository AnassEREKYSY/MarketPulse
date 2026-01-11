using MediatR;
using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;
using MarketPulse.Application.Queries;
using Microsoft.Extensions.Logging;

namespace MarketPulse.Application.Handlers;

public class SearchJobMarketQueryHandler : IRequestHandler<SearchJobMarketQuery, SearchJobMarketResult>
{
    private readonly IJobMarketProvider _jobMarketProvider;
    private readonly ICacheService _cacheService;
    private readonly ILogger<SearchJobMarketQueryHandler> _logger;

    public SearchJobMarketQueryHandler(
        IJobMarketProvider jobMarketProvider,
        ICacheService cacheService,
        ILogger<SearchJobMarketQueryHandler> logger)
    {
        _jobMarketProvider = jobMarketProvider;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<SearchJobMarketResult> Handle(SearchJobMarketQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var query = string.IsNullOrWhiteSpace(request.Query)
                ? "developer"
                : request.Query;

            var location = string.IsNullOrWhiteSpace(request.Location)
                ? "France"
                : request.Location;

            var cacheKey = $"jobs:search:{query}:{location}:{request.Page}:{request.PageSize}";

            _logger.LogInformation(
                "SearchJobMarketQueryHandler: Calling job provider with Query={Query}, Location={Location}, Page={Page}, PageSize={PageSize}",
                query, location, request.Page, request.PageSize
            );

            var jobs = await _jobMarketProvider.SearchJobsAsync(
                query,
                location,
                request.Page,
                request.PageSize
            );

            _logger.LogInformation("SearchJobMarketQueryHandler: Provider returned {Count} jobs", jobs.Count);
            
            if (jobs.Count == 0)
            {
                _logger.LogWarning("SearchJobMarketQueryHandler: No jobs returned from provider. Query={Query}, Location={Location}", query, location);
            }

            var filteredJobs = jobs.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(request.EmploymentType))
                filteredJobs = filteredJobs.Where(j => j.EmploymentType == request.EmploymentType);

            if (!string.IsNullOrWhiteSpace(request.WorkMode))
                filteredJobs = filteredJobs.Where(j => j.WorkMode == request.WorkMode);

            if (!string.IsNullOrWhiteSpace(request.ExperienceLevel))
                filteredJobs = filteredJobs.Where(j => j.ExperienceLevel == request.ExperienceLevel);

            if (request.MinSalary.HasValue)
                filteredJobs = filteredJobs.Where(j =>
                    j.SalaryRange != null &&
                    j.SalaryRange.AverageSalary >= request.MinSalary.Value);

            if (request.MaxSalary.HasValue)
                filteredJobs = filteredJobs.Where(j =>
                    j.SalaryRange != null &&
                    j.SalaryRange.AverageSalary <= request.MaxSalary.Value);

            var jobList = filteredJobs.ToList();

            var result = new SearchJobMarketResult
            {
                Jobs = jobList
                    .Skip((request.Page - 1) * request.PageSize)
                    .Take(request.PageSize)
                    .ToList(),
                TotalCount = jobList.Count,
                Page = request.Page,
                PageSize = request.PageSize
            };

            if (result.TotalCount > 0)
                await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromHours(6));

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SearchJobMarketQueryHandler");
            throw;
        }
    }
}
