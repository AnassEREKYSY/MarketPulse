using MarketPulse.Application.DTOs;

namespace MarketPulse.Application.Interfaces;

public interface IJobMarketProvider
{
    string ProviderName { get; }
    Task<List<JobOfferDto>> SearchJobsAsync(string query, string? location = null, int page = 1, int pageSize = 50);
    Task<bool> IsAvailableAsync();
}


