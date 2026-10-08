using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace MarketPulse.Tests;

/// <summary>Request rules that never reach the provider (no Adzuna key in tests).</summary>
public class ApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Health_reports_configuration()
    {
        var body = await factory.CreateClient().GetStringAsync("/api/health");
        Assert.Contains("\"ok\":true", body);
    }

    [Fact]
    public async Task Countries_list_is_static() =>
        Assert.Contains("\"code\":\"gb\"", await factory.CreateClient().GetStringAsync("/api/countries"));

    [Fact]
    public async Task Bad_input_is_400_json()
    {
        var res = await factory.CreateClient().GetAsync("/api/overview?country=zz");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("Unknown country", await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Missing_key_is_a_clear_503()
    {
        var res = await factory.CreateClient().GetAsync("/api/overview?country=fr&what=java");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, res.StatusCode);
        Assert.Contains("ADZUNA_APP_ID", await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Unknown_api_route_is_404_json()
    {
        var res = await factory.CreateClient().GetAsync("/api/nope");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }
}
