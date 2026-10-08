using System.Text.RegularExpressions;

namespace MarketPulse.Domain;

/// <summary>
/// Guesses work mode and seniority from the ad text. Providers do not give these fields,
/// so we look for whole words in several languages (Adzuna covers 19 countries).
/// </summary>
public static partial class Classifier
{
    // Whole words only: "remote" yes, "remotely managed printers" too (acceptable), "leader" ≠ "lead".
    [GeneratedRegex(@"\b(remote|fully remote|100% remote|work from home|wfh|t[ée]l[ée]travail|full remote|homeoffice|home office|remoto|teletrabajo|thuiswerk|zdalnie|telelavoro)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex RemoteRx();

    [GeneratedRegex(@"\b(hybrid|hybride|h[ií]brido|ibrido|teilweise remote|flexible working|\d\s*(days?|jours?)\s*(remote|de t[ée]l[ée]travail))\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex HybridRx();

    [GeneratedRegex(@"\b(lead|principal|staff|head of|architect|tech lead|chef de projet|manager)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex LeadRx();

    [GeneratedRegex(@"\b(senior|sr\.?|confirm[ée]e?|exp[ée]riment[ée]e?|expert)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex SeniorRx();

    [GeneratedRegex(@"\b(junior|jr\.?|graduate|entry[- ]level|d[ée]butant|alternance|apprenti|apprentice|intern|internship|stage|stagiaire|trainee)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex JuniorRx();

    [GeneratedRegex(@"\b(mid[- ]level|intermediate|medior|regular)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex MidRx();

    public static WorkMode WorkModeOf(string title, string text)
    {
        var all = $"{title} {text}";
        if (HybridRx().IsMatch(all)) return WorkMode.Hybrid;
        if (RemoteRx().IsMatch(all)) return WorkMode.Remote;
        return WorkMode.Onsite;
    }

    /// <summary>The title decides first (most reliable); the description only when the title says nothing.</summary>
    public static Seniority SeniorityOf(string title, string text)
    {
        foreach (var source in new[] { title, text })
        {
            if (JuniorRx().IsMatch(source)) return Seniority.Junior;
            if (LeadRx().IsMatch(source)) return Seniority.Lead;
            if (SeniorRx().IsMatch(source)) return Seniority.Senior;
            if (MidRx().IsMatch(source)) return Seniority.Mid;
        }
        return Seniority.Unspecified;
    }

    public static ContractType ContractOf(string? value) => value?.ToLowerInvariant() switch
    {
        "permanent" => ContractType.Permanent,
        "contract" => ContractType.Contract,
        _ => ContractType.Unspecified,
    };

    public static ContractTime TimeOf(string? value) => value?.ToLowerInvariant() switch
    {
        "full_time" => ContractTime.FullTime,
        "part_time" => ContractTime.PartTime,
        _ => ContractTime.Unspecified,
    };
}
