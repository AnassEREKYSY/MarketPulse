using MediatR;
using MarketPulse.Application.DTOs;

namespace MarketPulse.Application.Queries;

public class GetTrendsQuery : IRequest<TrendDataDto>
{
    public string? Location { get; set; }
    public string? Category { get; set; }
    public int Days { get; set; } = 30;
}


