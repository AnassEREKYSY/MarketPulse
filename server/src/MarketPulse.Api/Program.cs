using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using MarketPulse.Api;
using MarketPulse.Application;
using MarketPulse.Infrastructure;
using Microsoft.AspNetCore.Diagnostics;

var builder = WebApplication.CreateBuilder(args);
// HttpClient logs full request URLs at Information level, and Adzuna takes its key in the URL: keep those logs off.
builder.Logging.AddFilter("System.Net.Http.HttpClient", LogLevel.Warning);
// Same-origin requests carry an Origin header that is not in the dev CORS list: harmless, but noisy at Information.
builder.Logging.AddFilter("Microsoft.AspNetCore.Cors", LogLevel.Warning);
builder.WebHost.ConfigureKestrel(o => o.ListenAnyIP(int.TryParse(builder.Configuration["PORT"], out var p) ? p : 8080));

var adzuna = AdzunaOptions.FromEnvironment(k => builder.Configuration[k]);
var cacheDir = builder.Configuration["CACHE_DIR"] is { Length: > 0 } d ? d : Path.Combine(Path.GetTempPath(), "marketpulse-cache");
builder.Services.AddMarketPulse(adzuna, cacheDir);
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
// Production serves the app and the API from one origin; CORS is only for local development.
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins((builder.Configuration["CORS_ORIGINS"] ?? "http://localhost:4200").Split(',', StringSplitOptions.RemoveEmptyEntries))
    .WithMethods("GET").AllowAnyHeader()));

var app = builder.Build();
if (!adzuna.Configured) app.Logger.LogWarning("ADZUNA_APP_ID / ADZUNA_APP_KEY are not set: data endpoints will answer 503.");

app.UseExceptionHandler(e => e.Run(async ctx =>
{
    var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    var (status, message) = ex switch
    {
        MarketException m => (m.Status, m.Message),
        BadHttpRequestException => (400, "Invalid request."),
        _ => (500, "Something went wrong."),
    };
    if (status >= 500 && ex is not MarketException) app.Logger.LogError(ex, "Request failed");
    ctx.Response.StatusCode = status;
    await ctx.Response.WriteAsJsonAsync(new { error = message });
}));

app.UseCors();
app.UseDefaultFiles();
// Hashed bundles (main-ABC123.js) are immutable; everything else, index.html included, is revalidated.
var staticFiles = new StaticFileOptions
{
    OnPrepareResponse = c => c.Context.Response.Headers.CacheControl =
        Regex.IsMatch(c.File.Name, @"-[A-Z0-9]{8,}\.(js|css)$") ? "public,max-age=31536000,immutable" : "no-cache",
};
app.UseStaticFiles(staticFiles);

app.MapMarketApi();
app.MapFallback("/api/{**rest}", () => Results.Json(new { error = "Not found" }, statusCode: 404));
app.MapFallbackToFile("index.html", staticFiles);

// Old cache files are cleaned once at start.
(app.Services.GetRequiredService<ICache>() as TieredCache)?.Prune();
app.Run();

public partial class Program;
