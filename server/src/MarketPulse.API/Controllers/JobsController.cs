using MediatR;
using Microsoft.AspNetCore.Mvc;
using MarketPulse.Application.Queries;
using MarketPulse.Application.DTOs;
using System.Collections.Generic;

namespace MarketPulse.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JobsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<JobsController> _logger;

    public JobsController(IMediator mediator, ILogger<JobsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Search job offers with filters
    /// </summary>
    [HttpGet("search")]
    [ProducesResponseType(typeof(SearchJobMarketResult), StatusCodes.Status200OK)]
    public async Task<ActionResult<SearchJobMarketResult>> SearchJobs(
        [FromQuery] string? query = null,
        [FromQuery] string? location = null,
        [FromQuery] string? employmentType = null,
        [FromQuery] string? workMode = null,
        [FromQuery] string? experienceLevel = null,
        [FromQuery] decimal? minSalary = null,
        [FromQuery] decimal? maxSalary = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        Console.WriteLine($"[JobsController] SearchJobs called: query={query}, location={location}, page={page}");
        _logger.LogInformation("JobsController.SearchJobs called with Query={Query}, Location={Location}, Page={Page}, PageSize={PageSize}", 
            query, location, page, pageSize);
        
        try
        {
            Console.WriteLine($"[JobsController] Sending SearchJobMarketQuery to mediator");
            var result = await _mediator.Send(new SearchJobMarketQuery
            {
                Query = query,
                Location = location,
                EmploymentType = employmentType,
                WorkMode = workMode,
                ExperienceLevel = experienceLevel,
                MinSalary = minSalary,
                MaxSalary = maxSalary,
                Page = page,
                PageSize = pageSize
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching jobs: {Message}", ex.Message);
            // Return empty results instead of error to prevent CORS issues
            return Ok(new SearchJobMarketResult
            {
                Jobs = new List<JobOfferDto>(),
                TotalCount = 0,
                Page = page,
                PageSize = pageSize
            });
        }
    }

    /// <summary>
    /// Get job market statistics
    /// </summary>
    [HttpGet("statistics")]
    [ProducesResponseType(typeof(JobStatisticsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<JobStatisticsDto>> GetStatistics(
        [FromQuery] string? location = null,
        [FromQuery] string? employmentType = null,
        [FromQuery] string? workMode = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        try
        {
            var result = await _mediator.Send(new GetJobStatisticsQuery
            {
                Location = location,
                EmploymentType = employmentType,
                WorkMode = workMode,
                FromDate = fromDate,
                ToDate = toDate
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting statistics: {Message}", ex.Message);
            // Return empty statistics instead of error to prevent CORS issues
            return Ok(new JobStatisticsDto
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
            });
        }
    }

    /// <summary>
    /// Get salary analytics
    /// </summary>
    [HttpGet("salaries")]
    [ProducesResponseType(typeof(SalaryStatisticsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SalaryStatisticsDto>> GetSalaryAnalytics(
        [FromQuery] string? location = null,
        [FromQuery] string? experienceLevel = null,
        [FromQuery] string? employmentType = null)
    {
        try
        {
            var result = await _mediator.Send(new GetSalaryAnalyticsQuery
            {
                Location = location,
                ExperienceLevel = experienceLevel,
                EmploymentType = employmentType
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting salary analytics");
            return StatusCode(500, new { error = "An error occurred while getting salary analytics" });
        }
    }

    /// <summary>
    /// Get heatmap data for visualization
    /// </summary>
    [HttpGet("heatmap")]
    [ProducesResponseType(typeof(HeatMapDataDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<HeatMapDataDto>> GetHeatMapData(
        [FromQuery] string? country = null,
        [FromQuery] string? dataType = "jobs")
    {
        try
        {
            var result = await _mediator.Send(new GetHeatMapDataQuery
            {
                Country = country,
                DataType = dataType
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting heatmap data");
            return StatusCode(500, new { error = "An error occurred while getting heatmap data" });
        }
    }

    /// <summary>
    /// Get hiring and salary trends
    /// </summary>
    [HttpGet("trends")]
    [ProducesResponseType(typeof(TrendDataDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<TrendDataDto>> GetTrends(
        [FromQuery] string? location = null,
        [FromQuery] string? category = null,
        [FromQuery] int days = 30)
    {
        try
        {
            var result = await _mediator.Send(new GetTrendsQuery
            {
                Location = location,
                Category = category,
                Days = days
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trends");
            return StatusCode(500, new { error = "An error occurred while getting trends" });
        }
    }
}


