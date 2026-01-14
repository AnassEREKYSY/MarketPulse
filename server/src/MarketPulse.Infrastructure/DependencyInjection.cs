using MarketPulse.Application.Interfaces;
using MarketPulse.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using StackExchange.Redis;

namespace MarketPulse.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var redisHost = Environment.GetEnvironmentVariable("REDIS_HOST") ?? "localhost";
        var redisPort = Environment.GetEnvironmentVariable("REDIS_PORT") ?? "6379";
        var redisConnection = configuration.GetConnectionString("Redis")
            ?.Replace("${REDIS_HOST}", redisHost)
            ?.Replace("${REDIS_PORT}", redisPort)
            ?? $"{redisHost}:{redisPort}";

        services.AddMemoryCache();

        services.AddSingleton<IConnectionMultiplexer?>(sp =>
        {
            var logger = sp.GetRequiredService<ILoggerFactory>()
                           .CreateLogger("Redis");

            try
            {
                var options = ConfigurationOptions.Parse(redisConnection);
                options.AbortOnConnectFail = false;
                options.ConnectRetry = 3;
                options.ConnectTimeout = 3000;

                return ConnectionMultiplexer.Connect(options);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Redis unavailable, using in-memory cache");
                return null;
            }
        });

        services.AddScoped<ICacheService>(sp =>
        {
            var redis = sp.GetService<IConnectionMultiplexer>();

            if (redis != null && redis.IsConnected)
            {
                return new RedisCacheService(
                    redis,
                    sp.GetRequiredService<ILogger<RedisCacheService>>());
            }

            return new InMemoryCacheService(
                sp.GetRequiredService<IMemoryCache>(),
                sp.GetRequiredService<ILogger<InMemoryCacheService>>());
        });

        services.AddScoped<IJobMarketProvider, AdzunaJobProvider>();

        services.AddHttpClient<IGeocodingService, NominatimGeocodingService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
        });

        services.AddScoped<ISalaryNormalizer, SalaryNormalizer>();

        return services;
    }
}
