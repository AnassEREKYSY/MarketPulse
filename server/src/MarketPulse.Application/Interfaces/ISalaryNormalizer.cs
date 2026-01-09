using MarketPulse.Application.DTOs;

namespace MarketPulse.Application.Interfaces;

public interface ISalaryNormalizer
{
    SalaryRangeDto NormalizeSalary(SalaryRangeDto salary, string sourceCurrency, string targetCurrency = "EUR");
    decimal ConvertCurrency(decimal amount, string fromCurrency, string toCurrency);
}
