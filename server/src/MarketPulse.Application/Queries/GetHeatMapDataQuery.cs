using MediatR;
using MarketPulse.Application.DTOs;

namespace MarketPulse.Application.Queries;

public class GetHeatMapDataQuery : IRequest<HeatMapDataDto>
{
    public string? Country { get; set; }
    public string? DataType { get; set; } // "jobs" or "salary"
}


