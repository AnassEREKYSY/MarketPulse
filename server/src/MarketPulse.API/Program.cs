using MarketPulse.Application;
using MarketPulse.Infrastructure;
using System.Reflection;
using DotNetEnv;
using Microsoft.Extensions.Logging;
using System.Text;

// Register code page encodings to handle 'utf8' charset from Adzuna API
System.Text.Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

DotNetEnv.Env.Load();
var builder = WebApplication.CreateBuilder(args);

// Load environment variables from .env file
Env.Load();

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "MarketPulse Jobs API",
        Version = "v1",
        Description = "Job Market Intelligence Platform API"
    });
});

// CORS - Allow requests from frontend (development and production)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins(
                "http://localhost:4200",
                "http://localhost:4200/",
                "http://127.0.0.1:4200",
                "http://127.0.0.1:4200/"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
    
    // Development policy - more permissive
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Application Layer
builder.Services.AddApplication();

// Infrastructure Layer
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS must be FIRST, before any other middleware
if (app.Environment.IsDevelopment())
{
    app.UseCors("AllowAll"); // More permissive in development
}
else
{
    app.UseCors("AllowAngular");
}

// Add CORS headers to ALL responses - even before processing
// This middleware MUST run before any exception handling
app.Use(async (context, next) =>
{
    // Add CORS headers IMMEDIATELY, before any processing
    if (app.Environment.IsDevelopment())
    {
        context.Response.Headers["Access-Control-Allow-Origin"] = "*";
    }
    else
    {
        context.Response.Headers["Access-Control-Allow-Origin"] = "http://localhost:4200";
    }
    context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
    context.Response.Headers["Access-Control-Allow-Headers"] = "*";
    context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
    
    // Handle OPTIONS preflight
    if (context.Request.Method == "OPTIONS")
    {
        context.Response.StatusCode = 200;
        await context.Response.WriteAsync(string.Empty);
        return;
    }
    
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        // Ensure response hasn't started before modifying it
        if (!context.Response.HasStarted)
        {
            // CORS headers are already set above
            context.Response.StatusCode = 200; // Return 200 to ensure CORS works
            context.Response.ContentType = "application/json";
            
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
            
            var errorResponse = new { error = "An error occurred", details = app.Environment.IsDevelopment() ? ex.Message : null };
            await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(errorResponse));
        }
        else
        {
            // Response already started, rethrow to let ASP.NET Core handle it
            throw;
        }
    }
});

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// Database initialization is optional - only needed if storing data
// Since we're using external APIs and Redis cache only, we skip database initialization

app.Run();
