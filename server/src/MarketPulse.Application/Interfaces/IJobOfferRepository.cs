using MarketPulse.Domain.Entities;

namespace MarketPulse.Application.Interfaces;

public interface IJobOfferRepository : IRepository<JobOffer>
{
    Task<IEnumerable<JobOffer>> GetAllWithIncludesAsync();
}
