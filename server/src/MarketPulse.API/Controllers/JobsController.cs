using MediatR;
using Microsoft.AspNetCore.Mvc;
using MarketPulse.Application.Queries;
using MarketPulse.Application.DTOs;

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
        try
        {
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
            _logger.LogError(ex, "Error searching jobs");
            return StatusCode(500, new { error = "An error occurred while searching jobs" });
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
            _logger.LogError(ex, "Error getting statistics");
            return StatusCode(500, new { error = "An error occurred while getting statistics" });
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


