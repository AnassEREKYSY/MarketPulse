import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobsService } from '../../core/services/jobs.service';
import { SalaryStatistics, TrendData } from '../../core/models/statistics.model';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartComponent } from '../../shared/components/chart/chart.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    ChartComponent
  ],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent implements OnInit {
  private jobsService = inject(JobsService);
  
  salaryStats: SalaryStatistics | null = null;
  trends: TrendData | null = null;
  loading = true;
  error: string | null = null;

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.loading = true;
    this.error = null;

    this.jobsService.getSalaryAnalytics().subscribe({
      next: (stats) => {
        this.salaryStats = stats;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load analytics';
        this.loading = false;
        console.error(err);
      }
    });

    this.jobsService.getTrends({ days: 30 }).subscribe({
      next: (trendData) => {
        this.trends = trendData;
      },
      error: (err) => {
        console.error('Failed to load trends', err);
      }
    });
  }

  getSalaryByExperienceChart() {
    if (!this.salaryStats || !this.salaryStats.averageSalaryByExperience) return null;

    const data = Object.entries(this.salaryStats.averageSalaryByExperience);
    
    return {
      type: 'bar',
      data: {
        labels: data.map(([key]) => key),
        datasets: [{
          label: 'Average Salary (EUR/year)',
          data: data.map(([, value]) => value),
          backgroundColor: '#42a5f5'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Average Salary by Experience Level'
          }
        }
      }
    };
  }

  getSalaryByLocationChart() {
    if (!this.salaryStats || !this.salaryStats.averageSalaryByLocation) return null;

    const data = Object.entries(this.salaryStats.averageSalaryByLocation)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    
    return {
      type: 'bar',
      data: {
        labels: data.map(([key]) => key),
        datasets: [{
          label: 'Average Salary (EUR/year)',
          data: data.map(([, value]) => value),
          backgroundColor: '#1976d2'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Top 10 Locations by Average Salary'
          }
        }
      }
    };
  }

  getHiringTrendsChart() {
    if (!this.trends || !this.trends.hiringTrends.length) return null;

    return {
      type: 'line',
      data: {
        labels: this.trends.hiringTrends.map(t => new Date(t.date).toLocaleDateString()),
        datasets: [{
          label: 'Jobs Posted',
          data: this.trends.hiringTrends.map(t => t.value),
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Hiring Trends (Last 30 Days)'
          }
        }
      }
    };
  }

  getSalaryTrendsChart() {
    if (!this.trends || !this.trends.salaryTrends.length) return null;

    return {
      type: 'line',
      data: {
        labels: this.trends.salaryTrends.map(t => new Date(t.date).toLocaleDateString()),
        datasets: [{
          label: 'Average Salary (EUR/year)',
          data: this.trends.salaryTrends.map(t => t.value),
          borderColor: '#42a5f5',
          backgroundColor: 'rgba(66, 165, 245, 0.1)',
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Salary Trends (Last 30 Days)'
          }
        }
      }
    };
  }
}


