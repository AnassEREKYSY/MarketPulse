using System.Net;
using MarketPulse.Application;

namespace MarketPulse.Api;

/// <summary>
/// Daily question allowance for the assistant: per visitor (by IP) and for the whole site. Each question costs
/// OpenAI credit and can cost Adzuna calls, so both stay small. Kept in memory: a restart gives a fresh day.
/// </summary>
public sealed class AssistantLimiter(int perVisitor, int perDay, TimeProvider clock)
{
    private readonly object _gate = new();
    private readonly Dictionary<string, int> _visitors = [];
    private DateOnly _day;
    private int _total;

    public int PerVisitor => perVisitor;
    public int PerDay => perDay;

    /// <summary>Counts one question. Null when allowed, else the message to show.</summary>
    public string? Take(string visitor)
    {
        lock (_gate)
        {
            var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
            if (today != _day) { _day = today; _total = 0; _visitors.Clear(); }
            if (_total >= perDay) return "The assistant has answered all the questions it can for today. Come back tomorrow (UTC).";
            var used = _visitors.GetValueOrDefault(visitor);
            if (used >= perVisitor) return $"You have used your {perVisitor} questions for today. Come back tomorrow (UTC).";
            _visitors[visitor] = used + 1;
            _total++;
            return null;
        }
    }
}

public static class AssistantEndpoint
{
    public static void MapAssistant(this WebApplication app)
    {
        app.MapPost("/api/assistant", async (AskRequest body, HttpContext http, AssistantService assistant, IChatModel model, AssistantLimiter limiter, CancellationToken ct) =>
        {
            http.Response.Headers.CacheControl = "no-store";
            if (!model.Configured) throw new MarketException(503, "The assistant is not set up yet: OPENAI_API_KEY is missing on the server.");
            if (string.IsNullOrWhiteSpace(body.Question)) throw new MarketException(400, "Ask a question.");
            if (body.Question.Length > AssistantService.MaxQuestionLength)
                throw new MarketException(400, $"Questions are limited to {AssistantService.MaxQuestionLength} characters.");
            if (limiter.Take(Visitor(http)) is { } refusal) throw new MarketException(429, refusal);
            return await assistant.AskAsync(body, ct);
        });
    }

    /// <summary>The reverse proxy sets X-Real-IP (clients cannot reach the container directly).</summary>
    static string Visitor(HttpContext http)
    {
        var real = http.Request.Headers["X-Real-IP"].ToString();
        if (IPAddress.TryParse(real, out var ip)) return ip.ToString();
        return http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
