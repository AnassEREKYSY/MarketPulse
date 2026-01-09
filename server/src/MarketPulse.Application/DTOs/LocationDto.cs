namespace MarketPulse.Application.DTOs;

public class LocationDto
{
    public Guid Id { get; set; }
    public string City { get; set; } = string.Empty;
    public string? Region { get; set; }
    public string Country { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
}


