using System.Text.Json;
using MarketPulse.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace MarketPulse.Infrastructure.Services;

public interface IGeocodingService
{
    Task<(decimal? Latitude, decimal? Longitude)> GeocodeAsync(string city, string? country = null);
}

public class NominatimGeocodingService : IGeocodingService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<NominatimGeocodingService> _logger;

    public NominatimGeocodingService(
        HttpClient httpClient,
        ILogger<NominatimGeocodingService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "MarketPulse-Jobs/1.0");
    }

    public async Task<(decimal? Latitude, decimal? Longitude)> GeocodeAsync(string city, string? country = null)
    {
        try
        {
            var query = string.IsNullOrEmpty(country) ? city : $"{city}, {country}";
            var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(query)}&format=json&limit=1";

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var results = JsonSerializer.Deserialize<JsonElement[]>(content);

            if (results == null || results.Length == 0)
                return (null, null);

            var firstResult = results[0];
            if (firstResult.TryGetProperty("lat", out var lat) && firstResult.TryGetProperty("lon", out var lon))
            {
                if (decimal.TryParse(lat.GetString(), out var latitude) && 
                    decimal.TryParse(lon.GetString(), out var longitude))
                {
                    return (latitude, longitude);
                }
            }

            return (null, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error geocoding location: {City}, {Country}", city, country);
            return (null, null);
        }
    }
}
