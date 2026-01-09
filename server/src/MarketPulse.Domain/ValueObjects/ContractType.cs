namespace MarketPulse.Domain.ValueObjects;

public class ContractType
{
    public EmploymentType EmploymentType { get; set; }
    public WorkMode WorkMode { get; set; }
    public bool IsFullTime { get; set; } = true;
    
    public string GetDisplayName()
    {
        var employment = EmploymentType switch
        {
            EmploymentType.CDI => "CDI",
            EmploymentType.CDD => "CDD",
            EmploymentType.Freelance => "Freelance",
            EmploymentType.Internship => "Internship",
            _ => "Unknown"
        };
        
        var mode = WorkMode switch
        {
            WorkMode.Remote => "Remote",
            WorkMode.Hybrid => "Hybrid",
            WorkMode.Onsite => "Onsite",
            _ => ""
        };
        
        return $"{employment}{(string.IsNullOrEmpty(mode) ? "" : $" - {mode}")}";
    }
}


