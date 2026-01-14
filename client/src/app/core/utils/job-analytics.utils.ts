import { JobOffer, SalaryRange } from '../models/job-offer.model';
import { JobStatistics, SalaryStatistics } from '../models/statistics.model';

/**
 * Normalized salary data for a job
 */
export interface NormalizedSalary {
  yearlyEur: number;
  source: 'min' | 'max' | 'average' | 'calculated';
}

/**
 * Job with normalized salary data
 */
export interface JobWithSalary extends JobOffer {
  normalizedSalary: NormalizedSalary;
}

/**
 * Data quality metrics
 */
export interface DataQualityMetrics {
  totalJobs: number;
  jobsWithSalary: number;
  salaryCoverage: number; // percentage
  hasInsufficientSalaryData: boolean; // true if < 3 salary entries
  hasLimitedSample: boolean; // true if < 20 jobs
  uniqueLocations: number;
}

/**
 * Check if a job has valid salary data
 */
export function hasValidSalary(job: JobOffer): boolean {
  if (!job.salaryRange) {
    return false;
  }
  
  const { minSalary, maxSalary, averageSalary } = job.salaryRange;
  
  // At least one salary value must exist
  return (
    (minSalary !== null && minSalary !== undefined && minSalary > 0) ||
    (maxSalary !== null && maxSalary !== undefined && maxSalary > 0) ||
    (averageSalary !== null && averageSalary !== undefined && averageSalary > 0)
  );
}

/**
 * Normalize salary to yearly EUR
 * Adzuna provides salaries that are usually yearly but not guaranteed
 * This function ensures all salaries are in yearly EUR format
 */
export function normalizeSalaryToYearlyEur(job: JobOffer): NormalizedSalary | null {
  if (!hasValidSalary(job) || !job.salaryRange) {
    return null;
  }
  
  const { minSalary, maxSalary, averageSalary, currency = 'EUR', period = 'year' } = job.salaryRange;
  
  // Calculate base salary value
  let baseValue: number;
  let source: 'min' | 'max' | 'average' | 'calculated';
  
  if (minSalary && maxSalary && minSalary > 0 && maxSalary > 0) {
    // Both min and max exist → use average
    baseValue = (minSalary + maxSalary) / 2;
    source = 'calculated';
  } else if (averageSalary && averageSalary > 0) {
    // Use average if available
    baseValue = averageSalary;
    source = 'average';
  } else if (minSalary && minSalary > 0) {
    // Only min exists
    baseValue = minSalary;
    source = 'min';
  } else if (maxSalary && maxSalary > 0) {
    // Only max exists
    baseValue = maxSalary;
    source = 'max';
  } else {
    return null;
  }
  
  // Convert to EUR if needed (simplified - assumes backend provides EUR)
  // In a real app, you'd use an exchange rate service here
  let yearlyEur = baseValue;
  
  // Convert to yearly if needed
  if (period === 'month') {
    yearlyEur = baseValue * 12;
  } else if (period === 'week') {
    yearlyEur = baseValue * 52;
  } else if (period === 'day') {
    yearlyEur = baseValue * 365;
  } else if (period === 'hour') {
    yearlyEur = baseValue * 2080; // Assuming 40 hours/week
  }
  // 'year' or unknown → already yearly
  
  return {
    yearlyEur: Math.round(yearlyEur),
    source
  };
}

/**
 * Filter jobs with valid salary data
 */
export function filterJobsWithSalary(jobs: JobOffer[]): JobWithSalary[] {
  return jobs
    .map(job => {
      const normalizedSalary = normalizeSalaryToYearlyEur(job);
      if (normalizedSalary) {
        return { ...job, normalizedSalary };
      }
      return null;
    })
    .filter((job): job is JobWithSalary => job !== null);
}

/**
 * Calculate data quality metrics
 */
export function calculateDataQuality(jobs: JobOffer[]): DataQualityMetrics {
  const totalJobs = jobs.length;
  const jobsWithSalary = filterJobsWithSalary(jobs).length;
  const salaryCoverage = totalJobs > 0 ? (jobsWithSalary / totalJobs) * 100 : 0;
  
  // Get unique locations (normalized, lowercase, trimmed)
  const uniqueLocations = new Set<string>();
  jobs.forEach(job => {
    if (job.location?.city) {
      const city = job.location.city.trim().toLowerCase();
      if (city) {
        uniqueLocations.add(city);
      }
    }
  });
  
  return {
    totalJobs,
    jobsWithSalary,
    salaryCoverage: Math.round(salaryCoverage * 100) / 100,
    hasInsufficientSalaryData: jobsWithSalary < 3,
    hasLimitedSample: totalJobs < 20,
    uniqueLocations: uniqueLocations.size
  };
}

/**
 * Calculate average salary from normalized salaries
 */
export function calculateAverageSalary(jobsWithSalary: JobWithSalary[]): number | null {
  if (jobsWithSalary.length === 0) {
    return null;
  }
  
  const sum = jobsWithSalary.reduce((acc, job) => acc + job.normalizedSalary.yearlyEur, 0);
  return Math.round(sum / jobsWithSalary.length);
}

/**
 * Calculate median salary from normalized salaries
 */
export function calculateMedianSalary(jobsWithSalary: JobWithSalary[]): number | null {
  if (jobsWithSalary.length === 0) {
    return null;
  }
  
  const salaries = jobsWithSalary
    .map(job => job.normalizedSalary.yearlyEur)
    .sort((a, b) => a - b);
  
  const mid = Math.floor(salaries.length / 2);
  
  if (salaries.length % 2 === 0) {
    return Math.round((salaries[mid - 1] + salaries[mid]) / 2);
  } else {
    return salaries[mid];
  }
}

/**
 * Calculate min/max salary from normalized salaries
 */
export function calculateSalaryRange(jobsWithSalary: JobWithSalary[]): { min: number; max: number } | null {
  if (jobsWithSalary.length === 0) {
    return null;
  }
  
  const salaries = jobsWithSalary.map(job => job.normalizedSalary.yearlyEur);
  return {
    min: Math.round(Math.min(...salaries)),
    max: Math.round(Math.max(...salaries))
  };
}

/**
 * Calculate average salary by experience level
 * Only includes groups with at least 2 salary entries
 */
export function calculateAverageSalaryByExperience(
  jobsWithSalary: JobWithSalary[]
): Record<string, number> {
  const grouped = new Map<string, number[]>();
  
  jobsWithSalary.forEach(job => {
    const level = job.experienceLevel?.trim() || 'Unknown';
    if (!grouped.has(level)) {
      grouped.set(level, []);
    }
    grouped.get(level)!.push(job.normalizedSalary.yearlyEur);
  });
  
  const result: Record<string, number> = {};
  
  grouped.forEach((salaries, level) => {
    // Only include if we have at least 2 salary entries
    if (salaries.length >= 2) {
      const avg = salaries.reduce((a, b) => a + b, 0) / salaries.length;
      result[level] = Math.round(avg);
    }
  });
  
  return result;
}

/**
 * Calculate distribution counts (for employment type, work mode, experience level)
 * Returns counts only, no salary data
 */
export function calculateDistributionCounts(
  jobs: JobOffer[],
  field: 'employmentType' | 'workMode' | 'experienceLevel'
): Record<string, number> {
  const counts: Record<string, number> = {};
  
  jobs.forEach(job => {
    const value = job[field]?.trim() || 'Unknown';
    counts[value] = (counts[value] || 0) + 1;
  });
  
  // Filter out zero values and sort by count descending
  const filtered: Record<string, number> = {};
  Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .forEach(([key, value]) => {
      filtered[key] = value;
    });
  
  return filtered;
}

/**
 * Calculate top locations (unique cities, normalized)
 */
export function calculateTopLocations(jobs: JobOffer[], limit: number = 10): Record<string, number> {
  const counts: Record<string, number> = {};
  
  jobs.forEach(job => {
    if (job.location?.city) {
      const city = job.location.city.trim();
      const country = job.location.country?.trim() || 'Unknown';
      const key = `${city}, ${country}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  
  // Sort and limit
  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);
  
  const result: Record<string, number> = {};
  sorted.forEach(([key, value]) => {
    result[key] = value;
  });
  
  return result;
}

/**
 * Calculate top companies
 */
export function calculateTopCompanies(jobs: JobOffer[], limit: number = 10): Record<string, number> {
  const counts: Record<string, number> = {};
  
  jobs.forEach(job => {
    if (job.company?.name) {
      const name = job.company.name.trim();
      counts[name] = (counts[name] || 0) + 1;
    }
  });
  
  // Sort and limit
  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);
  
  const result: Record<string, number> = {};
  sorted.forEach(([key, value]) => {
    result[key] = value;
  });
  
  return result;
}

/**
 * Build complete statistics from jobs
 */
export function buildStatisticsFromJobs(jobs: JobOffer[]): {
  statistics: JobStatistics;
  quality: DataQualityMetrics;
} {
  const quality = calculateDataQuality(jobs);
  const jobsWithSalary = filterJobsWithSalary(jobs);
  
  // Salary statistics (only from jobs with salary)
  const salaryStats: SalaryStatistics = {
    averageSalary: calculateAverageSalary(jobsWithSalary) || undefined,
    medianSalary: calculateMedianSalary(jobsWithSalary) || undefined,
    averageSalaryByExperience: calculateAverageSalaryByExperience(jobsWithSalary),
    averageSalaryByLocation: {} // Can be enhanced if needed
  };
  
  const salaryRange = calculateSalaryRange(jobsWithSalary);
  if (salaryRange) {
    salaryStats.minSalary = salaryRange.min;
    salaryStats.maxSalary = salaryRange.max;
  }
  
  // Distribution counts (all jobs, no salary)
  const statistics: JobStatistics = {
    totalJobs: jobs.length,
    jobsByEmploymentType: calculateDistributionCounts(jobs, 'employmentType'),
    jobsByWorkMode: calculateDistributionCounts(jobs, 'workMode'),
    jobsByExperienceLevel: calculateDistributionCounts(jobs, 'experienceLevel'),
    topLocations: calculateTopLocations(jobs, 10),
    topCompanies: calculateTopCompanies(jobs, 10),
    salaryStatistics: salaryStats
  };
  
  return { statistics, quality };
}
