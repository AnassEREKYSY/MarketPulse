namespace MarketPulse.Application.DTOs;

public class HeatMapPointDto
{
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public int JobCount { get; set; }
    public decimal? AverageSalary { get; set; }
    public int Intensity { get; set; } // 0-100 for heatmap intensity
}


