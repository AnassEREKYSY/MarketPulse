export interface Country { code: string; name: string; currency: string; eurRate: number; }
export interface Bucket { from: number; to: number | null; count: number; }
export interface Share { name: string; count: number; percent: number; }
export interface RegionCount { name: string; count: number; }
export interface CompanyStat { name: string; count: number; averageSalary: number | null; }
export interface Category { tag: string; label: string; }
export interface MonthValue { month: string; value: number; }
export interface SalarySummary { mean: number | null; p10: number | null; p25: number | null; median: number | null; p75: number | null; p90: number | null; }

export interface Job {
  id: string; title: string; company: string; location: string; region: string; latitude: number | null; longitude: number | null;
  created: string; url: string; salaryMin: number | null; salaryMax: number | null; salaryIsEstimate: boolean;
  contract: 'Unspecified' | 'Permanent' | 'Contract'; time: 'Unspecified' | 'FullTime' | 'PartTime';
  category: string | null; snippet: string; workMode: 'Onsite' | 'Hybrid' | 'Remote'; seniority: 'Unspecified' | 'Junior' | 'Mid' | 'Senior' | 'Lead';
}

export interface Overview {
  country: string; currency: string; what: string | null; where: string | null; totalJobs: number;
  salary: SalarySummary; histogram: Bucket[]; remotePercent: number; hybridPercent: number; salaryAdvertisedPercent: number; sampleSize: number;
  contracts: Share[]; times: Share[]; seniority: Share[]; regions: RegionCount[]; companies: CompanyStat[]; newThisWeek: number; latest: Job[];
}
export interface JobsPage { total: number; page: number; pageSize: number; pages: number; currency: string; jobs: Job[]; }
export interface CompareItem { query: string; totalJobs: number; salary: SalarySummary; remotePercent: number; hybridPercent: number; seniority: Share[]; topRegion: string | null; topCompany: string | null; }
export interface Compare { country: string; currency: string; where: string | null; items: CompareItem[]; }
export interface SalaryGroup { name: string; median: number; jobs: number; }
export interface Salaries {
  country: string; currency: string; what: string | null; where: string | null; summary: SalarySummary; histogram: Bucket[];
  categoryLabel: string | null; history: MonthValue[]; bySeniority: SalaryGroup[]; byRegion: SalaryGroup[]; topPayingCompanies: CompanyStat[]; sampleWithSalary: number;
}
export interface CountryItem { code: string; name: string; currency: string; totalJobs: number; meanSalary: number | null; meanSalaryEur: number | null; medianSalary: number | null; medianSalaryEur: number | null; remotePercent: number; topRegion: string | null; }
export interface Countries { what: string | null; ratesAsOf: string; items: CountryItem[]; }
export interface MapPoint { name: string; latitude: number; longitude: number; count: number; medianSalary: number | null; }
export interface MapData { country: string; currency: string; what: string | null; where: string | null; totalJobs: number; sampled: number; points: MapPoint[]; regions: RegionCount[]; }

export interface JobFilters { page: number; sort: string; maxDaysOld: string; contract: string; time: string; workMode: string; salaryMin: string; category: string; }
