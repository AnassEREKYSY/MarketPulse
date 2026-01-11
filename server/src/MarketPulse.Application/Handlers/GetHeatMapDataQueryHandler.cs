using MediatR;
using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;
using MarketPulse.Application.Queries;

namespace MarketPulse.Application.Handlers;

public class GetHeatMapDataQueryHandler : IRequestHandler<GetHeatMapDataQuery, HeatMapDataDto>
{
    private readonly IJobMarketProvider _jobMarketProvider;
    private readonly ICacheService _cacheService;

    public GetHeatMapDataQueryHandler(
        IJobMarketProvider jobMarketProvider,
        ICacheService cacheService)
    {
        _jobMarketProvider = jobMarketProvider;
        _cacheService = cacheService;
    }

    public async Task<HeatMapDataDto> Handle(GetHeatMapDataQuery request, CancellationToken cancellationToken)
    {
        var cacheKey = $"heatmap:{request.Country}:{request.DataType}";
        
        var cachedData = await _cacheService.GetAsync<HeatMapDataDto>(cacheKey);
        if (cachedData != null)
        {
            return cachedData;
        }

        // Fetch jobs from external providers
        var allJobs = await _jobMarketProvider.SearchJobsAsync(
            string.Empty,
            request.Country,
            1,
            1000);

        var jobList = allJobs.Where(j => j.Location != null && 
                                         j.Location.Latitude.HasValue && 
                                         j.Location.Longitude.HasValue).ToList();

        var locationGroups = jobList
            .GroupBy(j => new { 
                City = j.Location!.City ?? "Unknown", 
                Country = j.Location!.Country ?? "Unknown", 
                Latitude = j.Location!.Latitude!.Value, 
                Longitude = j.Location!.Longitude!.Value 
            })
            .ToList();

        var maxCount = locationGroups.Any() ? locationGroups.Max(g => g.Count()) : 1;
        var maxSalary = jobList.Where(j => j.SalaryRange != null)
            .Select(j => j.SalaryRange!.AverageSalary)
            .DefaultIfEmpty(0)
            .Max();

        var points = locationGroups.Select(g => new HeatMapPointDto
        {
            Latitude = g.Key.Latitude,
            Longitude = g.Key.Longitude,
            City = g.Key.City,
            Country = g.Key.Country,
            JobCount = g.Count(),
            AverageSalary = g.Where(j => j.SalaryRange != null)
                .Select(j => j.SalaryRange!.AverageSalary)
                .DefaultIfEmpty(0)
                .Average(),
            Intensity = request.DataType == "salary" && maxSalary > 0
                ? (int)((g.Where(j => j.SalaryRange != null)
                    .Select(j => j.SalaryRange!.AverageSalary)
                    .DefaultIfEmpty(0)
                    .Average() / maxSalary) * 100)
                : (int)((g.Count() / (double)maxCount) * 100)
        }).ToList();

        var result = new HeatMapDataDto
        {
            Points = points,
            JobCountByLocation = locationGroups.ToDictionary(
                g => $"{g.Key.City}, {g.Key.Country}",
                g => g.Count()),
            AverageSalaryByLocation = locationGroups.ToDictionary(
                g => $"{g.Key.City}, {g.Key.Country}",
                g => g.Where(j => j.SalaryRange != null)
                    .Select(j => j.SalaryRange!.AverageSalary)
                    .DefaultIfEmpty(0)
                    .Average())
        };

        await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromHours(24));

        return result;
    }
}

