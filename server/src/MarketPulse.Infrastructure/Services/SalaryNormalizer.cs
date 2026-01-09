using MarketPulse.Application.DTOs;
using MarketPulse.Application.Interfaces;

namespace MarketPulse.Infrastructure.Services;

public class SalaryNormalizer : ISalaryNormalizer
{
    // Simplified currency conversion rates (in production, use a real API like ExchangeRate-API)
    private readonly Dictionary<string, decimal> _currencyRates = new()
    {
        { "EUR", 1.0m },
        { "USD", 0.92m },
        { "GBP", 1.17m },
        { "CHF", 1.02m },
        { "CAD", 0.68m },
        { "AUD", 0.61m }
    };

    public SalaryRangeDto NormalizeSalary(SalaryRangeDto salary, string sourceCurrency, string targetCurrency = "EUR")
    {
        if (salary.Currency == targetCurrency)
            return salary;

        var convertedMin = ConvertCurrency(salary.MinSalary, sourceCurrency, targetCurrency);
        var convertedMax = ConvertCurrency(salary.MaxSalary, sourceCurrency, targetCurrency);

        return new SalaryRangeDto
        {
            MinSalary = convertedMin,
            MaxSalary = convertedMax,
            AverageSalary = (convertedMin + convertedMax) / 2,
            Currency = targetCurrency,
            Period = salary.Period
        };
    }

    public decimal ConvertCurrency(decimal amount, string fromCurrency, string toCurrency)
    {
        if (fromCurrency == toCurrency)
            return amount;

        // Convert to EUR first, then to target currency
        var eurRate = _currencyRates.GetValueOrDefault(fromCurrency.ToUpper(), 1.0m);
        var targetRate = _currencyRates.GetValueOrDefault(toCurrency.ToUpper(), 1.0m);

        var amountInEur = amount / eurRate;
        return amountInEur * targetRate;
    }
}
