namespace MarketPulse.Infrastructure;

public sealed record AdzunaOptions(string AppId, string AppKey, string BaseUrl, int DailyLimit, int PerMinuteLimit)
{
    public bool Configured => AppId != "" && AppKey != "";

    public static AdzunaOptions FromEnvironment(Func<string, string?> get) => new(
        get("ADZUNA_APP_ID")?.Trim() ?? "",
        get("ADZUNA_APP_KEY")?.Trim() ?? "",
        (get("ADZUNA_API_BASE") ?? "https://api.adzuna.com/v1/api").TrimEnd('/'),
        int.TryParse(get("ADZUNA_DAILY_LIMIT"), out var d) && d > 0 ? d : 240,
        int.TryParse(get("ADZUNA_PER_MINUTE_LIMIT"), out var m) && m > 0 ? m : 24);
}
