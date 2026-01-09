using MediatR;
using MarketPulse.Application.DTOs;

namespace MarketPulse.Application.Queries;

public class GetJobStatisticsQuery : IRequest<JobStatisticsDto>
{
    public string? Location { get; set; }
    public string? EmploymentType { get; set; }
    public string? WorkMode { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}


