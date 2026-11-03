using MarketPulse.Application;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace MarketPulse.Infrastructure;

public static class DependencyInjection
{
    /// <summary>Adzuna client, quota guard, cache (memory + <paramref name="cacheDirectory"/>) and the use cases.</summary>
    public static IServiceCollection AddMarketPulse(this IServiceCollection services, AdzunaOptions adzuna, string? cacheDirectory, OpenAiOptions? openAi = null)
    {
        services.AddSingleton(adzuna);
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<QuotaGuard>();
        services.AddMemoryCache(o => o.SizeLimit = null);
        services.AddSingleton<ICache>(sp => new TieredCache(sp.GetRequiredService<IMemoryCache>(), cacheDirectory,
            sp.GetRequiredService<TimeProvider>(), sp.GetRequiredService<ILogger<TieredCache>>()));
        services.AddHttpClient<IJobMarket, AdzunaJobMarket>(c => c.Timeout = TimeSpan.FromSeconds(20));
        services.AddScoped<MarketService>();
        // Assistant: OpenAI over plain HttpClient. Without OPENAI_API_KEY the endpoint answers 503 and the rest works as before.
        services.AddSingleton(openAi ?? new OpenAiOptions("", "gpt-4o-mini", "https://api.openai.com/v1"));
        services.AddHttpClient<IChatModel, OpenAiChatModel>(c => c.Timeout = TimeSpan.FromSeconds(40));
        services.AddScoped<AssistantService>();
        return services;
    }
}
