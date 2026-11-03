using System.Net;
using System.Net.Http.Json;
using MarketPulse.Api;
using MarketPulse.Application;
using Microsoft.AspNetCore.Mvc.Testing;

namespace MarketPulse.Tests;

/// <summary>A chat model that plays back scripted replies and records what it was sent.</summary>
sealed class FakeChat(params ChatReply[] script) : IChatModel
{
    public bool Configured { get; init; } = true;
    public List<IReadOnlyList<ChatMessage>> Sent = [];
    public List<IReadOnlyList<ChatTool>> ToolsOffered = [];
    int _i;

    public Task<ChatReply> CompleteAsync(IReadOnlyList<ChatMessage> messages, IReadOnlyList<ChatTool> tools, CancellationToken ct)
    {
        Sent.Add(messages.ToList());
        ToolsOffered.Add(tools);
        return Task.FromResult(script[Math.Min(_i++, script.Length - 1)]);
    }

    public static ChatReply Call(string name, string args, string id = "call_1") => new(null, [new ChatToolCall(id, name, args)]);
    public static ChatReply Say(string text) => new(text, []);
}

public class AssistantTests
{
    static AssistantService Service(IChatModel chat, FakeMarket? market = null) =>
        new(new MarketService(market ?? new FakeMarket(), new DictCache()), chat, TimeProvider.System);

    static AskRequest Ask(string q, string? country = "fr", string? what = null) => new(q, null, country, what, null);

    [Fact]
    public async Task Answers_from_tool_results_and_lists_the_screens_used()
    {
        var chat = new FakeChat(FakeChat.Call("market_overview", """{ "what": ".NET" }"""), FakeChat.Say("There are **120** open .NET jobs."));
        var answer = await Service(chat).AskAsync(Ask("How many .NET jobs in France?"), default);

        Assert.Equal("There are **120** open .NET jobs.", answer.Answer);
        var source = Assert.Single(answer.Sources);
        Assert.Equal("/", source.Path);
        Assert.Equal(".NET", source.Query["q"]);
        Assert.Equal("fr", source.Query["c"]);

        // The second call carries the tool result, computed by MarketService (FakeMarket reports 120 jobs).
        var toolMessage = chat.Sent[1].Single(m => m.Role == "tool");
        Assert.Equal("call_1", toolMessage.ToolCallId);
        Assert.Contains("\"openJobs\":120", toolMessage.Content);
    }

    [Fact]
    public async Task Tool_errors_go_back_to_the_model_instead_of_failing()
    {
        var chat = new FakeChat(FakeChat.Call("salaries", """{ "what": "java", "country": "zz" }"""), FakeChat.Say("Unknown country."));
        var answer = await Service(chat).AskAsync(Ask("Java salaries?"), default);

        Assert.Equal("Unknown country.", answer.Answer);
        Assert.Contains("Unknown country", chat.Sent[1].Single(m => m.Role == "tool").Content);
        Assert.Empty(answer.Sources);
    }

    [Fact]
    public async Task Compare_tools_link_to_their_screens()
    {
        var chat = new FakeChat(
            new ChatReply(null, [
                new ChatToolCall("a", "compare_skills", """{ "skills": ["java", "python"] }"""),
                new ChatToolCall("b", "compare_countries", """{ "what": "java", "countries": ["fr", "de"] }"""),
            ]),
            FakeChat.Say("Done."));
        var answer = await Service(chat).AskAsync(Ask("Java vs Python, and France vs Germany?"), default);

        Assert.Contains(answer.Sources, s => s.Path == "/compare" && s.Query["skills"] == "java,python");
        Assert.Contains(answer.Sources, s => s.Path == "/countries" && s.Query["countries"] == "fr,de");
    }

    [Fact]
    public async Task Stops_offering_tools_on_the_last_round()
    {
        var chat = new FakeChat(FakeChat.Call("market_overview", """{ "what": "go" }"""));
        var answer = await Service(chat).AskAsync(Ask("Loop forever"), default);

        Assert.Empty(chat.ToolsOffered.Last());
        Assert.NotEmpty(answer.Answer);
    }

    [Fact]
    public async Task Uses_the_current_search_country_by_default()
    {
        var market = new FakeMarket();
        var chat = new FakeChat(FakeChat.Call("market_overview", """{ "what": "nurse" }"""), FakeChat.Say("ok"));
        await Service(chat, market).AskAsync(Ask("Nurses?", country: "gb"), default);

        Assert.All(market.Searches, s => Assert.Equal("gb", s.Country));
        Assert.Contains("Default country: gb", chat.Sent[0][0].Content);
    }

    [Fact]
    public async Task Refuses_without_a_key_or_a_question()
    {
        await Assert.ThrowsAsync<MarketException>(() => Service(new FakeChat { Configured = false }).AskAsync(Ask("hi"), default));
        var e = await Assert.ThrowsAsync<MarketException>(() => Service(new FakeChat()).AskAsync(Ask("  "), default));
        Assert.Equal(400, e.Status);
    }

    [Fact]
    public void Limiter_counts_per_visitor_and_per_day()
    {
        var limiter = new AssistantLimiter(perVisitor: 2, perDay: 3, TimeProvider.System);
        Assert.Null(limiter.Take("a"));
        Assert.Null(limiter.Take("a"));
        Assert.NotNull(limiter.Take("a"));
        Assert.Null(limiter.Take("b"));
        Assert.NotNull(limiter.Take("c"));
    }
}

/// <summary>The endpoint without an OpenAI key (as in CI).</summary>
public class AssistantApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Missing_key_is_a_clear_503()
    {
        var res = await factory.CreateClient().PostAsJsonAsync("/api/assistant", new { question = "How many .NET jobs?" });
        Assert.Equal(HttpStatusCode.ServiceUnavailable, res.StatusCode);
        Assert.Contains("OPENAI_API_KEY", await res.Content.ReadAsStringAsync());
    }
}
