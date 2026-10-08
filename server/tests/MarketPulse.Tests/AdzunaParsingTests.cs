using System.Text.Json;
using MarketPulse.Domain;
using MarketPulse.Infrastructure;

namespace MarketPulse.Tests;

public class AdzunaParsingTests
{
    static JsonElement J(string s) => JsonDocument.Parse(s).RootElement;

    [Fact]
    public void Job_is_normalised()
    {
        var j = AdzunaJobMarket.ParseJob(J("""
        {"id":"4123","title":"Senior <strong>.NET</strong> Developer","description":"Full remote &amp; great team",
         "created":"2026-10-01T09:00:00Z","redirect_url":"https://adzuna/x","company":{"display_name":"Acme"},
         "location":{"display_name":"Paris, Ile-de-France","area":["France","Ile-de-France","Paris"]},
         "latitude":48.85,"longitude":2.35,"salary_min":50000,"salary_max":60000,"salary_is_predicted":"0",
         "contract_type":"permanent","contract_time":"full_time","category":{"tag":"it-jobs","label":"IT Jobs"}}
        """))!;
        Assert.Equal("Senior .NET Developer", j.Title);
        Assert.Equal("Full remote & great team", j.Snippet);
        Assert.Equal("Ile-de-France", j.Region);
        Assert.Equal(55000m, j.Salary);
        Assert.False(j.SalaryIsEstimate);
        Assert.Equal(WorkMode.Remote, j.WorkMode);
        Assert.Equal(Seniority.Senior, j.Seniority);
        Assert.Equal(ContractTime.FullTime, j.Time);
        Assert.Equal("it-jobs", j.CategoryTag);
    }

    [Fact]
    public void Missing_fields_do_not_break_parsing()
    {
        var j = AdzunaJobMarket.ParseJob(J("""{"title":"Dev","salary_is_predicted":"1","salary_min":0}"""))!;
        Assert.Equal("Company not shown", j.Company);
        Assert.Null(j.Salary);
        Assert.True(j.SalaryIsEstimate);
        Assert.Null(AdzunaJobMarket.ParseJob(J("""{"title":""}""")));
    }
}
