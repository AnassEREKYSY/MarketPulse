namespace MarketPulse.Application.DTOs;

public class TrendDataDto
{
    public List<TrendPointDto> HiringTrends { get; set; } = new();
    public List<TrendPointDto> SalaryTrends { get; set; } = new();
    public Dictionary<string, List<TrendPointDto>> TrendsByCategory { get; set; } = new();
}


