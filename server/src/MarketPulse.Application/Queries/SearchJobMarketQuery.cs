using MediatR;
using MarketPulse.Application.DTOs;

namespace MarketPulse.Application.Queries;

public class SearchJobMarketQuery : IRequest<SearchJobMarketResult>
{
    public string? Query { get; set; }
    public string? Location { get; set; }
    public string? EmploymentType { get; set; }
    public string? WorkMode { get; set; }
    public string? ExperienceLevel { get; set; }
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class SearchJobMarketResult
{
    public List<JobOfferDto> Jobs { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}


