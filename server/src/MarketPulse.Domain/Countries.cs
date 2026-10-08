namespace MarketPulse.Domain;

/// <param name="EurRate">Approximate value of one unit of the currency in euros, only used to compare countries.</param>
public sealed record Country(string Code, string Name, string Currency, decimal EurRate, string DefaultLocation);

/// <summary>The 19 markets Adzuna covers.</summary>
public static class Countries
{
    /// <summary>Indicative exchange rates (EUR per unit). Shown as approximate in the UI.</summary>
    public const string RatesAsOf = "2026-09";

    public static readonly IReadOnlyList<Country> All =
    [
        new("fr", "France", "EUR", 1m, "Paris"),
        new("gb", "United Kingdom", "GBP", 1.17m, "London"),
        new("us", "United States", "USD", 0.88m, "New York"),
        new("de", "Germany", "EUR", 1m, "Berlin"),
        new("nl", "Netherlands", "EUR", 1m, "Amsterdam"),
        new("be", "Belgium", "EUR", 1m, "Brussels"),
        new("es", "Spain", "EUR", 1m, "Madrid"),
        new("it", "Italy", "EUR", 1m, "Milano"),
        new("at", "Austria", "EUR", 1m, "Wien"),
        new("ch", "Switzerland", "CHF", 1.07m, "Zürich"),
        new("pl", "Poland", "PLN", 0.235m, "Warszawa"),
        new("ca", "Canada", "CAD", 0.63m, "Toronto"),
        new("au", "Australia", "AUD", 0.57m, "Sydney"),
        new("nz", "New Zealand", "NZD", 0.52m, "Auckland"),
        new("sg", "Singapore", "SGD", 0.67m, "Singapore"),
        new("in", "India", "INR", 0.0102m, "Bangalore"),
        new("za", "South Africa", "ZAR", 0.049m, "Johannesburg"),
        new("br", "Brazil", "BRL", 0.16m, "São Paulo"),
        new("mx", "Mexico", "MXN", 0.047m, "Ciudad de México"),
    ];

    public static Country? Find(string? code) =>
        All.FirstOrDefault(c => string.Equals(c.Code, code?.Trim(), StringComparison.OrdinalIgnoreCase));
}
