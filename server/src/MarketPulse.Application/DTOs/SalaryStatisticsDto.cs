namespace MarketPulse.Application.DTOs;

public class SalaryStatisticsDto
{
    public decimal? AverageSalary { get; set; }
    public decimal? MedianSalary { get; set; }
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public Dictionary<string, decimal> AverageSalaryByExperience { get; set; } = new();
    public Dictionary<string, decimal> AverageSalaryByLocation { get; set; } = new();
}


