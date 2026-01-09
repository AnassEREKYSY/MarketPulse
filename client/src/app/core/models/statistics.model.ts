export interface JobStatistics {
  totalJobs: number;
  jobsByEmploymentType: Record<string, number>;
  jobsByWorkMode: Record<string, number>;
  jobsByExperienceLevel: Record<string, number>;
  topCompanies: Record<string, number>;
  topLocations: Record<string, number>;
  salaryStatistics: SalaryStatistics;
}

export interface SalaryStatistics {
  averageSalary?: number;
  medianSalary?: number;
  minSalary?: number;
  maxSalary?: number;
  averageSalaryByExperience: Record<string, number>;
  averageSalaryByLocation: Record<string, number>;
}

export interface HeatMapData {
  points: HeatMapPoint[];
  jobCountByLocation: Record<string, number>;
  averageSalaryByLocation: Record<string, number>;
}

export interface HeatMapPoint {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  jobCount: number;
  averageSalary?: number;
  intensity: number;
}

export interface TrendData {
  hiringTrends: TrendPoint[];
  salaryTrends: TrendPoint[];
  trendsByCategory: Record<string, TrendPoint[]>;
}

export interface TrendPoint {
  date: string;
  value: number;
  count: number;
}


