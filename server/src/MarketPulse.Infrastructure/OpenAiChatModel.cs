using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using MarketPulse.Application;
using Microsoft.Extensions.Logging;

namespace MarketPulse.Infrastructure;

public sealed record OpenAiOptions(string ApiKey, string Model, string BaseUrl)
{
    public bool Configured => ApiKey != "";

    public static OpenAiOptions FromEnvironment(Func<string, string?> get) => new(
        get("OPENAI_API_KEY")?.Trim() ?? "",
        get("OPENAI_MODEL")?.Trim() is { Length: > 0 } m ? m : "gpt-4o-mini",
        (get("OPENAI_BASE_URL")?.Trim() is { Length: > 0 } u ? u : "https://api.openai.com/v1").TrimEnd('/'));
}

/// <summary>
/// OpenAI Chat Completions with function calling, over plain HttpClient (no SDK, like the Adzuna client).
/// The key is sent in a header and never logged.
/// </summary>
public sealed class OpenAiChatModel(HttpClient http, OpenAiOptions options, ILogger<OpenAiChatModel> log) : IChatModel
{
    public bool Configured => options.Configured;

    public async Task<ChatReply> CompleteAsync(IReadOnlyList<ChatMessage> messages, IReadOnlyList<ChatTool> tools, CancellationToken ct)
    {
        var body = new JsonObject
        {
            ["model"] = options.Model,
            ["max_completion_tokens"] = 700,
            ["messages"] = new JsonArray(messages.Select(ToJson).ToArray<JsonNode?>()),
        };
        // Reasoning models (o-series, gpt-5) only accept the default temperature.
        if (options.Model.StartsWith("gpt-4", StringComparison.OrdinalIgnoreCase)) body["temperature"] = 0.2;
        if (tools.Count > 0)
            body["tools"] = new JsonArray(tools.Select(t => (JsonNode?)new JsonObject
            {
                ["type"] = "function",
                ["function"] = new JsonObject { ["name"] = t.Name, ["description"] = t.Description, ["parameters"] = JsonNode.Parse(t.Parameters) },
            }).ToArray());

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{options.BaseUrl}/chat/completions")
        {
            Content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);

        HttpResponseMessage response;
        try { response = await http.SendAsync(request, ct); }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            log.LogWarning("OpenAI request failed: {Error}", e.GetType().Name);
            throw new MarketException(504, "The assistant did not answer in time. Try again in a moment.");
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var status = (int)response.StatusCode;
                log.LogWarning("OpenAI answered {Status}", status);
                throw status switch
                {
                    401 or 403 => new MarketException(503, "The assistant is not set up correctly (the OpenAI key was refused)."),
                    429 => new MarketException(429, "The assistant is busy or has used its credit. Try again later."),
                    _ => new MarketException(502, "The assistant could not answer. Try again in a moment."),
                };
            }

            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var message = doc.RootElement.GetProperty("choices")[0].GetProperty("message");
            var content = message.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String ? c.GetString() : null;
            var calls = new List<ChatToolCall>();
            if (message.TryGetProperty("tool_calls", out var list) && list.ValueKind == JsonValueKind.Array)
                foreach (var call in list.EnumerateArray())
                {
                    var fn = call.GetProperty("function");
                    calls.Add(new ChatToolCall(call.GetProperty("id").GetString() ?? "", fn.GetProperty("name").GetString() ?? "",
                        fn.TryGetProperty("arguments", out var args) ? args.GetString() ?? "{}" : "{}"));
                }
            return new ChatReply(content, calls);
        }
    }

    static JsonNode ToJson(ChatMessage m)
    {
        var o = new JsonObject { ["role"] = m.Role, ["content"] = m.Content };
        if (m.ToolCalls is { Count: > 0 })
            o["tool_calls"] = new JsonArray(m.ToolCalls.Select(t => (JsonNode?)new JsonObject
            {
                ["id"] = t.Id,
                ["type"] = "function",
                ["function"] = new JsonObject { ["name"] = t.Name, ["arguments"] = t.Arguments },
            }).ToArray());
        if (m.ToolCallId is not null) o["tool_call_id"] = m.ToolCallId;
        return o;
    }
}
