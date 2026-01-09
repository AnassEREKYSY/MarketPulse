namespace MarketPulse.Application.DTOs;

public class HeatMapDataDto
{
    public List<HeatMapPointDto> Points { get; set; } = new();
    public Dictionary<string, int> JobCountByLocation { get; set; } = new();
    public Dictionary<string, decimal> AverageSalaryByLocation { get; set; } = new();
}


