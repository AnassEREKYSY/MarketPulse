namespace MarketPulse.Application.DTOs;

public class JobOfferDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public CompanyDto Company { get; set; } = null!;
    public LocationDto Location { get; set; } = null!;
    public string EmploymentType { get; set; } = string.Empty;
    public string WorkMode { get; set; } = string.Empty;
    public string ExperienceLevel { get; set; } = string.Empty;
    public SalaryRangeDto? SalaryRange { get; set; }
    public DateTime PublishedDate { get; set; }
    public string SourceUrl { get; set; } = string.Empty;
}


