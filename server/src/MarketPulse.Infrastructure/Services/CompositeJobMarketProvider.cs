using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;

namespace MarketPulse.Infrastructure.Services;

public class CompositeJobMarketProvider : IJobMarketProvider
{
    private readonly AdzunaJobProvider _adzunaProvider;
    private readonly JSearchJobProvider _jSearchProvider;
    private readonly ILogger<CompositeJobMarketProvider> _logger;

    public string ProviderName => "Composite";

    public CompositeJobMarketProvider(
        AdzunaJobProvider adzunaProvider,
        JSearchJobProvider jSearchProvider,
        ILogger<CompositeJobMarketProvider> logger)
    {
        _adzunaProvider = adzunaProvider;
        _jSearchProvider = jSearchProvider;
        _logger = logger;
    }

    public async Task<bool> IsAvailableAsync()
    {
        return await _adzunaProvider.IsAvailableAsync() || await _jSearchProvider.IsAvailableAsync();
    }

    public async Task<List<JobOfferDto>> SearchJobsAsync(string query, string? location = null, int page = 1, int pageSize = 50)
    {
        var results = new List<JobOfferDto>();

        // Try Adzuna first
        if (await _adzunaProvider.IsAvailableAsync())
        {
            try
            {
                var adzunaResults = await _adzunaProvider.SearchJobsAsync(query, location, page, pageSize);
                results.AddRange(adzunaResults);
                _logger.LogInformation("Retrieved {Count} jobs from Adzuna", adzunaResults.Count);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error fetching from Adzuna, falling back to JSearch");
            }
        }

        // If we don't have enough results, try JSearch
        if (results.Count < pageSize && await _jSearchProvider.IsAvailableAsync())
        {
            try
            {
                var jSearchResults = await _jSearchProvider.SearchJobsAsync(query, location, page, pageSize);
                results.AddRange(jSearchResults);
                _logger.LogInformation("Retrieved {Count} jobs from JSearch", jSearchResults.Count);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error fetching from JSearch");
            }
        }

        // Remove duplicates based on title and company
        return results
            .GroupBy(j => new { j.Title, j.Company.Name })
            .Select(g => g.First())
            .Take(pageSize)
            .ToList();
    }
}


