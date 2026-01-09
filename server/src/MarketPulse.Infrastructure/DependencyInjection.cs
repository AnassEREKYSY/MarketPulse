using MarketPulse.Application.Interfaces;
using MarketPulse.Infrastructure.Data;
using MarketPulse.Infrastructure.Repositories;
using MarketPulse.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace MarketPulse.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Build connection string from environment variables or configuration
        var dbHost = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
        var dbPort = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
        var dbName = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "marketpulse";
        var dbUser = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "postgres";
        var dbPassword = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "postgres";
        
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?.Replace("${POSTGRES_HOST}", dbHost)
            ?.Replace("${POSTGRES_PORT}", dbPort)
            ?.Replace("${POSTGRES_DB}", dbName)
            ?.Replace("${POSTGRES_USER}", dbUser)
            ?.Replace("${POSTGRES_PASSWORD}", dbPassword)
            ?? $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword}";

        // Database
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString));

        // Redis
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
                services.AddSingleton<IConnectionMultiplexer>(sp =>
                    ConnectionMultiplexer.Connect(redisConnection));
                services.AddScoped<ICacheService, RedisCacheService>();
            }
            catch
            {
                // Fallback to in-memory cache if Redis connection fails
                services.AddMemoryCache();
                services.AddScoped<ICacheService, InMemoryCacheService>();
            }
        }
        else
        {
            // Fallback to in-memory cache if Redis is not configured
            services.AddMemoryCache();
            services.AddScoped<ICacheService, InMemoryCacheService>();
        }

        // Repositories
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IJobOfferRepository, JobOfferRepository>();

        // External Services
        services.AddHttpClient<AdzunaJobProvider>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
        });
        services.AddHttpClient<JSearchJobProvider>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
        });
        
        // Register job providers
        services.AddScoped<AdzunaJobProvider>();
        services.AddScoped<JSearchJobProvider>();
        
        // Composite provider that tries Adzuna first, then JSearch
        services.AddScoped<IJobMarketProvider, CompositeJobMarketProvider>();

        services.AddHttpClient<IGeocodingService, NominatimGeocodingService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
        });

        // Business Services
        services.AddScoped<ISalaryNormalizer, SalaryNormalizer>();

        return services;
    }
}

