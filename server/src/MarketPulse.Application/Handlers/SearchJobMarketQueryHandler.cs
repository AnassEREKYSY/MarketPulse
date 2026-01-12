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

            // Fetch more jobs to allow proper filtering (fetch 5x pageSize to ensure we have enough after filtering)
            var fetchSize = Math.Max(request.PageSize * 5, 100);
            var jobs = await _jobMarketProvider.SearchJobsAsync(
                query,
                location,
                1,
                fetchSize
            );

            _logger.LogInformation("SearchJobMarketQueryHandler: Provider returned {Count} jobs", jobs.Count);
            
            if (jobs.Count == 0)
            {
                _logger.LogWarning("SearchJobMarketQueryHandler: No jobs returned from provider. Query={Query}, Location={Location}", query, location);
            }

            var filteredJobs = jobs.AsEnumerable();

            // Apply filters
            if (!string.IsNullOrWhiteSpace(request.EmploymentType))
            {
                filteredJobs = filteredJobs.Where(j => 
                    !string.IsNullOrWhiteSpace(j.EmploymentType) && 
                    j.EmploymentType.Equals(request.EmploymentType, StringComparison.OrdinalIgnoreCase));
                _logger.LogInformation("Filtered by EmploymentType={Type}, Remaining={Count}", request.EmploymentType, filteredJobs.Count());
            }

            if (!string.IsNullOrWhiteSpace(request.WorkMode))
            {
                filteredJobs = filteredJobs.Where(j => 
                    !string.IsNullOrWhiteSpace(j.WorkMode) && 
                    j.WorkMode.Equals(request.WorkMode, StringComparison.OrdinalIgnoreCase));
                _logger.LogInformation("Filtered by WorkMode={Mode}, Remaining={Count}", request.WorkMode, filteredJobs.Count());
            }

            if (!string.IsNullOrWhiteSpace(request.ExperienceLevel))
            {
                filteredJobs = filteredJobs.Where(j => 
                    !string.IsNullOrWhiteSpace(j.ExperienceLevel) && 
                    j.ExperienceLevel.Equals(request.ExperienceLevel, StringComparison.OrdinalIgnoreCase));
                _logger.LogInformation("Filtered by ExperienceLevel={Level}, Remaining={Count}", request.ExperienceLevel, filteredJobs.Count());
            }

            if (request.MinSalary.HasValue)
            {
                filteredJobs = filteredJobs.Where(j =>
                    j.SalaryRange != null &&
                    j.SalaryRange.AverageSalary > 0 &&
                    j.SalaryRange.AverageSalary >= request.MinSalary.Value);
                _logger.LogInformation("Filtered by MinSalary={Salary}, Remaining={Count}", request.MinSalary, filteredJobs.Count());
            }

            if (request.MaxSalary.HasValue)
            {
                filteredJobs = filteredJobs.Where(j =>
                    j.SalaryRange != null &&
                    j.SalaryRange.AverageSalary > 0 &&
                    j.SalaryRange.AverageSalary <= request.MaxSalary.Value);
                _logger.LogInformation("Filtered by MaxSalary={Salary}, Remaining={Count}", request.MaxSalary, filteredJobs.Count());
            }

            var jobList = filteredJobs.ToList();
            var totalCount = jobList.Count;

            // Apply pagination
            var paginatedJobs = jobList
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToList();

            var result = new SearchJobMarketResult
            {
                Jobs = paginatedJobs,
                TotalCount = totalCount,
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
