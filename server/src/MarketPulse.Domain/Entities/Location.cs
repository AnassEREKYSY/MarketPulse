namespace MarketPulse.Domain.Entities;

public class Location
{
    public Guid Id { get; set; }
    public string City { get; set; } = string.Empty;
    public string? Region { get; set; }
    public string Country { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    
    public ICollection<JobOffer> JobOffers { get; set; } = new List<JobOffer>();
}


