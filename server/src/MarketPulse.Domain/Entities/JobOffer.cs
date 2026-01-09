namespace MarketPulse.Domain.Entities;

public class JobOffer
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;
    public EmploymentType EmploymentType { get; set; }
    public WorkMode WorkMode { get; set; }
    public string ExperienceLevel { get; set; } = string.Empty; // Junior, Mid, Senior, Lead
    public SalaryRange? SalaryRange { get; set; }
    public DateTime PublishedDate { get; set; }
    public string SourceUrl { get; set; } = string.Empty;
    public string SourceProvider { get; set; } = string.Empty;
    public string? ExternalId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

