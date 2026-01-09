namespace MarketPulse.Application.DTOs;

public class SalaryRangeDto
{
    public decimal MinSalary { get; set; }
    public decimal MaxSalary { get; set; }
    public decimal AverageSalary { get; set; }
    public string Currency { get; set; } = "EUR";
    public string Period { get; set; } = "Yearly";
}


