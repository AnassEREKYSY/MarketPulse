namespace MarketPulse.Domain.ValueObjects;

public class ExperienceLevel
{
    public int MinYears { get; set; }
    public int MaxYears { get; set; }
    public string Level { get; set; } = string.Empty; // Junior, Mid, Senior, Lead, etc.
    
    public static ExperienceLevel FromString(string level)
    {
        return level.ToLower() switch
        {
            "junior" or "entry" or "entry-level" => new ExperienceLevel { MinYears = 0, MaxYears = 2, Level = "Junior" },
            "mid" or "middle" or "mid-level" => new ExperienceLevel { MinYears = 2, MaxYears = 5, Level = "Mid" },
            "senior" => new ExperienceLevel { MinYears = 5, MaxYears = 10, Level = "Senior" },
            "lead" or "principal" or "expert" => new ExperienceLevel { MinYears = 10, MaxYears = int.MaxValue, Level = "Lead" },
            _ => new ExperienceLevel { MinYears = 0, MaxYears = int.MaxValue, Level = "Any" }
        };
    }
}


