using MediatR;
using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;
using MarketPulse.Application.Queries;
using MarketPulse.Infrastructure.Repositories;

namespace MarketPulse.Application.Handlers;

public class GetHeatMapDataQueryHandler : IRequestHandler<GetHeatMapDataQuery, HeatMapDataDto>
{
    private readonly IJobOfferRepository _jobRepository;
    private readonly ICacheService _cacheService;

    public GetHeatMapDataQueryHandler(
        IJobOfferRepository jobRepository,
        ICacheService cacheService)
    {
        _jobRepository = jobRepository;
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

        var allJobs = await _jobRepository.GetAllWithIncludesAsync();
        var jobs = allJobs.AsQueryable();

        if (!string.IsNullOrEmpty(request.Country))
        {
            jobs = jobs.Where(j => j.Location.Country == request.Country || 
                                   j.Location.CountryCode == request.Country);
        }

        var jobList = jobs.Where(j => j.Location.Latitude.HasValue && j.Location.Longitude.HasValue).ToList();

        var locationGroups = jobList
            .GroupBy(j => new { j.Location.City, j.Location.Country, j.Location.Latitude, j.Location.Longitude })
            .ToList();

        var maxCount = locationGroups.Any() ? locationGroups.Max(g => g.Count()) : 1;
        var maxSalary = jobList.Where(j => j.SalaryRange != null)
            .Select(j => j.SalaryRange!.NormalizeToYearly().AverageSalary)
            .DefaultIfEmpty(0)
            .Max();

        var points = locationGroups.Select(g => new HeatMapPointDto
        {
            Latitude = g.Key.Latitude!.Value,
            Longitude = g.Key.Longitude!.Value,
            City = g.Key.City,
            Country = g.Key.Country,
            JobCount = g.Count(),
            AverageSalary = g.Where(j => j.SalaryRange != null)
                .Select(j => j.SalaryRange!.NormalizeToYearly().AverageSalary)
                .DefaultIfEmpty(0)
                .Average(),
            Intensity = request.DataType == "salary" && maxSalary > 0
                ? (int)((g.Where(j => j.SalaryRange != null)
                    .Select(j => j.SalaryRange!.NormalizeToYearly().AverageSalary)
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
                    .Select(j => j.SalaryRange!.NormalizeToYearly().AverageSalary)
                    .DefaultIfEmpty(0)
                    .Average())
        };

        await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromHours(24));

        return result;
    }
}

