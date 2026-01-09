using MarketPulse.Application.Interfaces;
using MarketPulse.Domain.Entities;
using MarketPulse.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MarketPulse.Infrastructure.Repositories;

public interface IJobOfferRepository : IRepository<JobOffer>
{
    Task<IEnumerable<JobOffer>> GetAllWithIncludesAsync();
}

public class JobOfferRepository : Repository<JobOffer>, IJobOfferRepository
{
    public JobOfferRepository(ApplicationDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<JobOffer>> GetAllWithIncludesAsync()
    {
        return await _dbSet
            .Include(j => j.Company)
            .Include(j => j.Location)
            .ToListAsync();
    }

    public override async Task<IEnumerable<JobOffer>> GetAllAsync()
    {
        return await _dbSet
            .Include(j => j.Company)
            .Include(j => j.Location)
            .ToListAsync();
    }
}


