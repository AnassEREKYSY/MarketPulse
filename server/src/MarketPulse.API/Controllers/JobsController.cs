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
        _logger.LogInformation(
            "JobsController.SearchJobs Query={Query}, Location={Location}, Page={Page}, PageSize={PageSize}",
            query, location, page, pageSize);

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

        _logger.LogInformation(
            "JobsController.SearchJobs returned Jobs={Count}, Total={TotalCount}",
            result?.Jobs?.Count ?? 0, result?.TotalCount ?? 0);

        return Ok(result);
    }

    [HttpGet("statistics")]
    [ProducesResponseType(typeof(JobStatisticsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<JobStatisticsDto>> GetStatistics(
        [FromQuery] string? location = null,
        [FromQuery] string? employmentType = null,
        [FromQuery] string? workMode = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
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

    [HttpGet("salaries")]
    [ProducesResponseType(typeof(SalaryStatisticsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SalaryStatisticsDto>> GetSalaryAnalytics(
        [FromQuery] string? location = null,
        [FromQuery] string? experienceLevel = null,
        [FromQuery] string? employmentType = null)
    {
        var result = await _mediator.Send(new GetSalaryAnalyticsQuery
        {
            Location = location,
            ExperienceLevel = experienceLevel,
            EmploymentType = employmentType
        });

        return Ok(result);
    }

    [HttpGet("heatmap")]
    [ProducesResponseType(typeof(HeatMapDataDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<HeatMapDataDto>> GetHeatMapData(
        [FromQuery] string? country = null,
        [FromQuery] string? dataType = "jobs")
    {
        var result = await _mediator.Send(new GetHeatMapDataQuery
        {
            Country = country,
            DataType = dataType
        });

        return Ok(result);
    }

    [HttpGet("trends")]
    [ProducesResponseType(typeof(TrendDataDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<TrendDataDto>> GetTrends(
        [FromQuery] string? location = null,
        [FromQuery] string? category = null,
        [FromQuery] int days = 30)
    {
        var result = await _mediator.Send(new GetTrendsQuery
        {
            Location = location,
            Category = category,
            Days = days
        });

        return Ok(result);
    }
}
