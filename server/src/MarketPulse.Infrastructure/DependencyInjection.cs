using MarketPulse.Application.Interfaces;
using MarketPulse.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace MarketPulse.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var redisHost = Environment.GetEnvironmentVariable("REDIS_HOST") ?? "localhost";
        var redisPort = Environment.GetEnvironmentVariable("REDIS_PORT") ?? "6379";
        var redisConnection = configuration.GetConnectionString("Redis")
            ?.Replace("${REDIS_HOST}", redisHost)
            ?.Replace("${REDIS_PORT}", redisPort)
            ?? $"{redisHost}:{redisPort}";

        if (!string.IsNullOrEmpty(redisConnection))
        {
            try
            {
                var redisConfig = $"{redisConnection},abortConnect=false";
                services.AddSingleton<IConnectionMultiplexer>(_ =>
                    ConnectionMultiplexer.Connect(redisConfig));
                services.AddScoped<ICacheService, RedisCacheService>();
            }
            catch
            {
                services.AddMemoryCache();
                services.AddScoped<ICacheService, InMemoryCacheService>();
            }
        }
        else
        {
            services.AddMemoryCache();
            services.AddScoped<ICacheService, InMemoryCacheService>();
        }

        // Use Adzuna directly (no composite provider needed)
        // Note: AdzunaJobProvider now uses HttpWebRequest instead of HttpClient
        // to bypass encoding issues with 'utf8' charset in Adzuna API responses
        services.AddScoped<IJobMarketProvider, AdzunaJobProvider>();

        services.AddHttpClient<IGeocodingService, NominatimGeocodingService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
        });

        services.AddScoped<ISalaryNormalizer, SalaryNormalizer>();

        return services;
    }
}
