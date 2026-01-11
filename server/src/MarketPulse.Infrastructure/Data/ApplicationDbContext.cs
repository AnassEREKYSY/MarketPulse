using Microsoft.EntityFrameworkCore;
using MarketPulse.Domain.Entities;

namespace MarketPulse.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<JobOffer> JobOffers { get; set; }
    public DbSet<Company> Companies { get; set; }
    public DbSet<Location> Locations { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<JobOffer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ExternalId);
            entity.HasIndex(e => e.PublishedDate);
            entity.HasOne(e => e.Company)
                .WithMany(c => c.JobOffers)
                .HasForeignKey(e => e.CompanyId);
            entity.HasOne(e => e.Location)
                .WithMany(l => l.JobOffers)
                .HasForeignKey(e => e.LocationId);
            
            // Configure SalaryRange as an owned entity (value object)
            entity.OwnsOne(e => e.SalaryRange, salaryRange =>
            {
                salaryRange.Property(s => s.MinSalary).HasColumnName("MinSalary");
                salaryRange.Property(s => s.MaxSalary).HasColumnName("MaxSalary");
                salaryRange.Property(s => s.Currency).HasColumnName("Currency");
                salaryRange.Property(s => s.Period).HasColumnName("Period");
            });
        });

        modelBuilder.Entity<Company>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Name);
        });

        modelBuilder.Entity<Location>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.City, e.Country });
        });
    }
}


