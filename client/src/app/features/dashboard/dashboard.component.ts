import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JobsService } from '../../core/services/jobs.service';
import { JobStatistics } from '../../core/models/statistics.model';
import { JobOffer, SearchJobMarketResult } from '../../core/models/job-offer.model';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    StatCardComponent,
    ChartComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private jobsService = inject(JobsService);
  private router = inject(Router);
  
  // Statistics for display
  statistics: JobStatistics | null = null;
  loading = true;
  error: string | null = null;
  
  // Search functionality
  searchQuery: string = '';
  searchLocation: string = '';
  showSearchResults = false;
  searchResults: SearchJobMarketResult | null = null;
  searchLoading = false;
  searchError: string | null = null;

  employmentTypes = ['CDI', 'CDD', 'Freelance', 'Internship'];
  workModes = ['Remote', 'Hybrid', 'Onsite'];

  ngOnInit() {
    this.loadStatistics();
  }

  getTopLocationsCount(): number {
    return this.statistics ? Object.keys(this.statistics.topLocations || {}).length : 0;
  }

  getTopCompaniesCount(): number {
    return this.statistics ? Object.keys(this.statistics.topCompanies || {}).length : 0;
  }

  loadStatistics() {
    this.loading = true;
    this.error = null;
    
    this.jobsService.getStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading statistics:', err);
        this.error = null; // Don't show error, just use empty stats
        this.statistics = {
          totalJobs: 0,
          salaryStatistics: {
            averageSalary: undefined,
            medianSalary: undefined,
            minSalary: undefined,
            maxSalary: undefined,
            averageSalaryByExperience: {},
            averageSalaryByLocation: {}
          },
          topLocations: {},
          topCompanies: {},
          jobsByEmploymentType: {},
          jobsByWorkMode: {},
          jobsByExperienceLevel: {}
        };
        this.loading = false;
      }
    });
  }

  onSearch() {
    if (!this.searchQuery && !this.searchLocation) {
      return;
    }

    this.showSearchResults = true;
    this.searchLoading = true;
    this.searchError = null;

    this.jobsService.searchJobs({
      query: this.searchQuery || undefined,
      location: this.searchLocation || undefined,
      page: 1,
      pageSize: 50
    }).subscribe({
      next: (result) => {
        this.searchResults = result;
        this.searchLoading = false;
        
        // Load statistics for the search results
        if (this.searchLocation) {
          this.loadStatisticsForLocation(this.searchLocation);
        }
      },
      error: (err) => {
        console.error('Search error:', err);
        this.searchError = 'Failed to search jobs. Please try again.';
        this.searchLoading = false;
      }
    });
  }

  loadStatisticsForLocation(location: string) {
    this.jobsService.getStatistics({ location }).subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (err) => {
        console.error('Error loading location statistics:', err);
      }
    });
  }

  clearSearch() {
    this.showSearchResults = false;
    this.searchResults = null;
    this.searchQuery = '';
    this.searchLocation = '';
    this.loadStatistics(); // Reload general statistics
  }

  getEmploymentTypeChartData() {
    if (!this.statistics || !this.statistics.jobsByEmploymentType) return null;
    const data = this.statistics.jobsByEmploymentType;
    if (Object.keys(data).length === 0) return null;
    
    return {
      type: 'pie',
      data: {
        labels: Object.keys(data),
        datasets: [{
          data: Object.values(data),
          backgroundColor: ['#1976d2', '#42a5f5', '#90caf9', '#e3f2fd', '#bbdefb']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Jobs by Employment Type'
          }
        }
      }
    };
  }

  getWorkModeChartData() {
    if (!this.statistics || !this.statistics.jobsByWorkMode) return null;
    const data = this.statistics.jobsByWorkMode;
    if (Object.keys(data).length === 0) return null;
    
    return {
      type: 'bar',
      data: {
        labels: Object.keys(data),
        datasets: [{
          label: 'Jobs',
          data: Object.values(data),
          backgroundColor: '#1976d2'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Jobs by Work Mode'
          }
        }
      }
    };
  }

  getExperienceChartData() {
    if (!this.statistics || !this.statistics.jobsByExperienceLevel) return null;
    const data = this.statistics.jobsByExperienceLevel;
    if (Object.keys(data).length === 0) return null;
    
    return {
      type: 'bar',
      data: {
        labels: Object.keys(data),
        datasets: [{
          label: 'Jobs',
          data: Object.values(data),
          backgroundColor: '#42a5f5'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Jobs by Experience Level'
          }
        }
      }
    };
  }

}
