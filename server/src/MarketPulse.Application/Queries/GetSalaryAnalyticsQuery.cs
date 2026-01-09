using MediatR;
using MarketPulse.Application.DTOs;

namespace MarketPulse.Application.Queries;

public class GetSalaryAnalyticsQuery : IRequest<SalaryStatisticsDto>
{
    public string? Location { get; set; }
    public string? ExperienceLevel { get; set; }
    public string? EmploymentType { get; set; }
}


