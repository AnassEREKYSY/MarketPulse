import { Injectable } from '@angular/core';
import { JobOffer } from '../models/job-offer.model';
import {
  buildStatisticsFromJobs,
  calculateDataQuality,
  filterJobsWithSalary,
  calculateAverageSalaryByExperience,
  calculateDistributionCounts,
  DataQualityMetrics
} from '../utils/job-analytics.utils';

/**
 * Chart configuration for ECharts
 */
export interface ChartConfig {
  type: 'bar' | 'pie' | 'line';
  title: { text: string };
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string | string[];
    }>;
  };
  options?: {
    yAxis?: { name: string };
    isCountChart?: boolean; // true for distribution charts (no € symbols)
  };
}

/**
 * Analytics result with statistics and chart configurations
 */
export interface AnalyticsResult {
  statistics: ReturnType<typeof buildStatisticsFromJobs>['statistics'];
  quality: DataQualityMetrics;
  charts: {
    employmentType?: ChartConfig;
    workMode?: ChartConfig;
    experienceLevel?: ChartConfig;
    salaryByExperience?: ChartConfig;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  /**
   * Analyze jobs and generate statistics and chart configurations
   */
  analyzeJobs(jobs: JobOffer[]): AnalyticsResult {
    if (!jobs || jobs.length === 0) {
      return this.getEmptyAnalytics();
    }
    
    const { statistics, quality } = buildStatisticsFromJobs(jobs);
    
    // Build chart configurations
    const charts = {
      employmentType: this.buildDistributionChart(
        statistics.jobsByEmploymentType,
        'Employment Type Distribution',
        '#667eea'
      ),
      workMode: this.buildDistributionChart(
        statistics.jobsByWorkMode,
        'Work Mode Analysis',
        '#764ba2'
      ),
      experienceLevel: this.buildDistributionChart(
        statistics.jobsByExperienceLevel,
        'Experience Level Distribution',
        '#f093fb'
      ),
      salaryByExperience: this.buildSalaryChart(
        statistics.salaryStatistics.averageSalaryByExperience,
        'Average Salary by Experience Level',
        '#4facfe'
      )
    };
    
    return {
      statistics,
      quality,
      charts
    };
  }
  
  /**
   * Build distribution chart (counts only, no € symbols)
   */
  private buildDistributionChart(
    data: Record<string, number>,
    title: string,
    color: string
  ): ChartConfig | undefined {
    const entries = Object.entries(data).filter(([, value]) => value > 0);
    
    if (entries.length === 0) {
      return undefined;
    }
    
    // Sort by count descending
    const sorted = entries.sort(([, a], [, b]) => b - a);
    
    return {
      type: 'bar',
      title: { text: title },
      data: {
        labels: sorted.map(([key]) => key),
        datasets: [{
          label: 'Number of Jobs',
          data: sorted.map(([, value]) => value),
          backgroundColor: color
        }]
      },
      options: {
        yAxis: { name: 'Number of Jobs' },
        isCountChart: true // Flag to indicate this is a count chart (no €)
      }
    };
  }
  
  /**
   * Build salary chart (only jobs with salary, shows €)
   */
  private buildSalaryChart(
    data: Record<string, number>,
    title: string,
    color: string
  ): ChartConfig | undefined {
    const entries = Object.entries(data).filter(([, value]) => value && value > 0);
    
    if (entries.length === 0) {
      return undefined;
    }
    
    // Sort by experience level order (Junior, Mid, Senior, Lead, Any)
    const experienceOrder = ['Junior', 'Mid', 'Senior', 'Lead', 'Any'];
    const sorted = entries.sort(([keyA], [keyB]) => {
      const indexA = experienceOrder.indexOf(keyA);
      const indexB = experienceOrder.indexOf(keyB);
      if (indexA === -1 && indexB === -1) return keyA.localeCompare(keyB);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    return {
      type: 'bar',
      title: { text: title },
      data: {
        labels: sorted.map(([key]) => key),
        datasets: [{
          label: 'Average Salary (EUR/year)',
          data: sorted.map(([, value]) => Math.round(value)),
          backgroundColor: color
        }]
      },
      options: {
        yAxis: { name: 'Salary (EUR/year)' },
        isCountChart: false // This is a salary chart (show €)
      }
    };
  }
  
  /**
   * Get empty analytics result
   */
  private getEmptyAnalytics(): AnalyticsResult {
    return {
      statistics: {
        totalJobs: 0,
        jobsByEmploymentType: {},
        jobsByWorkMode: {},
        jobsByExperienceLevel: {},
        topLocations: {},
        topCompanies: {},
        salaryStatistics: {
          averageSalary: undefined,
          medianSalary: undefined,
          minSalary: undefined,
          maxSalary: undefined,
          averageSalaryByExperience: {},
          averageSalaryByLocation: {}
        }
      },
      quality: {
        totalJobs: 0,
        jobsWithSalary: 0,
        salaryCoverage: 0,
        hasInsufficientSalaryData: true,
        hasLimitedSample: true,
        uniqueLocations: 0
      },
      charts: {}
    };
  }
  
  /**
   * Format salary for display
   */
  formatSalary(value: number | undefined | null): string {
    if (value === null || value === undefined || value === 0) {
      return 'N/A';
    }
    
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k €`;
    }
    
    return `${Math.round(value).toLocaleString()} €`;
  }
  
  /**
   * Get data quality warning message
   */
  getQualityWarning(quality: DataQualityMetrics): string | null {
    if (quality.hasInsufficientSalaryData) {
      return 'Insufficient salary data (< 3 entries)';
    }
    
    if (quality.hasLimitedSample) {
      return 'Limited data sample (< 20 jobs)';
    }
    
    return null;
  }
}
