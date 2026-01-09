namespace MarketPulse.Application.DTOs;

public class CompanyDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Industry { get; set; }
    public string? Website { get; set; }
    public string? LogoUrl { get; set; }
    public int? EmployeeCount { get; set; }
}


