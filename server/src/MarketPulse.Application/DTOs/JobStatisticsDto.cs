namespace MarketPulse.Application.DTOs;

public class JobStatisticsDto
{
    public int TotalJobs { get; set; }
    public Dictionary<string, int> JobsByEmploymentType { get; set; } = new();
    public Dictionary<string, int> JobsByWorkMode { get; set; } = new();
    public Dictionary<string, int> JobsByExperienceLevel { get; set; } = new();
    public Dictionary<string, int> TopCompanies { get; set; } = new();
    public Dictionary<string, int> TopLocations { get; set; } = new();
    public SalaryStatisticsDto SalaryStatistics { get; set; } = new();
}


