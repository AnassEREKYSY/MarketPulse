using MarketPulse.Domain;

namespace MarketPulse.Tests;

public class ClassifierTests
{
    [Theory]
    [InlineData("Développeur .NET", "Poste en full remote", WorkMode.Remote)]
    [InlineData("Backend engineer", "2 jours de télétravail par semaine, hybride", WorkMode.Hybrid)]
    [InlineData("Java developer (Remote)", "", WorkMode.Remote)]
    [InlineData("Entwickler", "Homeoffice möglich", WorkMode.Remote)]
    [InlineData("Développeur", "Sur site à Lyon", WorkMode.Onsite)]
    [InlineData("Developer", "We control remotes for TVs", WorkMode.Onsite)]
    public void Work_mode(string title, string text, WorkMode expected) => Assert.Equal(expected, Classifier.WorkModeOf(title, text));

    [Theory]
    [InlineData("Senior Angular Developer", "", Seniority.Senior)]
    [InlineData("Développeur confirmé", "", Seniority.Senior)]
    [InlineData("Tech Lead .NET", "junior team", Seniority.Lead)]
    [InlineData("Alternance développeur web", "", Seniority.Junior)]
    [InlineData("Developer", "We hire a senior profile", Seniority.Senior)]
    [InlineData("Developer", "Team leader wanted", Seniority.Unspecified)]
    [InlineData("Developer", "", Seniority.Unspecified)]
    public void Seniority_title_first(string title, string text, Seniority expected) => Assert.Equal(expected, Classifier.SeniorityOf(title, text));

    [Fact]
    public void Contract_fields_map_to_both_axes()
    {
        Assert.Equal(ContractType.Permanent, Classifier.ContractOf("permanent"));
        Assert.Equal(ContractTime.PartTime, Classifier.TimeOf("part_time"));
        Assert.Equal(ContractType.Unspecified, Classifier.ContractOf("part_time"));
    }
}
