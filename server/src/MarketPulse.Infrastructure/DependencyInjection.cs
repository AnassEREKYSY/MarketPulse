using MarketPulse.Application;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace MarketPulse.Infrastructure;

public static class DependencyInjection
{
    /// <summary>Adzuna client, quota guard, cache (memory + <paramref name="cacheDirectory"/>) and the use cases.</summary>
    public static IServiceCollection AddMarketPulse(this IServiceCollection services, AdzunaOptions adzuna, string? cacheDirectory)
    {
        services.AddSingleton(adzuna);
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<QuotaGuard>();
        services.AddMemoryCache(o => o.SizeLimit = null);
        services.AddSingleton<ICache>(sp => new TieredCache(sp.GetRequiredService<IMemoryCache>(), cacheDirectory,
            sp.GetRequiredService<TimeProvider>(), sp.GetRequiredService<ILogger<TieredCache>>()));
        services.AddHttpClient<IJobMarket, AdzunaJobMarket>(c => c.Timeout = TimeSpan.FromSeconds(20));
        services.AddScoped<MarketService>();
        return services;
    }
}
