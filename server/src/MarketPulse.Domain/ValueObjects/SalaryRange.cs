namespace MarketPulse.Domain.ValueObjects;

public class SalaryRange
{
    public decimal MinSalary { get; set; }
    public decimal MaxSalary { get; set; }
    public string Currency { get; set; } = "EUR";
    public SalaryPeriod Period { get; set; } = SalaryPeriod.Yearly;
    
    public decimal AverageSalary => (MinSalary + MaxSalary) / 2;
    
    public SalaryRange NormalizeToYearly()
    {
        if (Period == SalaryPeriod.Yearly)
            return this;
            
        var multiplier = Period switch
        {
            SalaryPeriod.Monthly => 12m,
            SalaryPeriod.Weekly => 52m,
            SalaryPeriod.Daily => 260m,
            _ => 1m
        };
        
        return new SalaryRange
        {
            MinSalary = MinSalary * multiplier,
            MaxSalary = MaxSalary * multiplier,
            Currency = Currency,
            Period = SalaryPeriod.Yearly
        };
    }
}

public enum SalaryPeriod
{
    Yearly,
    Monthly,
    Weekly,
    Daily
}


