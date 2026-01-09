export interface JobOffer {
  id: string;
  title: string;
  description: string;
  company: Company;
  location: Location;
  employmentType: string;
  workMode: string;
  experienceLevel: string;
  salaryRange?: SalaryRange;
  publishedDate: string;
  sourceUrl: string;
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  logoUrl?: string;
  employeeCount?: number;
}

export interface Location {
  id: string;
  city: string;
  region?: string;
  country: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
}

export interface SalaryRange {
  minSalary: number;
  maxSalary: number;
  averageSalary: number;
  currency: string;
  period: string;
}

export interface SearchJobMarketResult {
  jobs: JobOffer[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}


