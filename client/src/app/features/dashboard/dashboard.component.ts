import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobsService } from '../../core/services/jobs.service';
import { JobStatistics } from '../../core/models/statistics.model';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    StatCardComponent,
    ChartComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private jobsService = inject(JobsService);
  
  statistics: JobStatistics | null = null;
  loading = true;
  error: string | null = null;

  ngOnInit() {
    this.loadStatistics();
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
        this.error = 'Failed to load statistics';
        this.loading = false;
        console.error(err);
      }
    });
  }

  getEmploymentTypeChartData() {
    if (!this.statistics) return null;
    
    return {
      type: 'pie',
      data: {
        labels: Object.keys(this.statistics.jobsByEmploymentType),
        datasets: [{
          data: Object.values(this.statistics.jobsByEmploymentType),
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
    if (!this.statistics) return null;
    
    return {
      type: 'bar',
      data: {
        labels: Object.keys(this.statistics.jobsByWorkMode),
        datasets: [{
          label: 'Jobs',
          data: Object.values(this.statistics.jobsByWorkMode),
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
    if (!this.statistics) return null;
    
    return {
      type: 'bar',
      data: {
        labels: Object.keys(this.statistics.jobsByExperienceLevel),
        datasets: [{
          label: 'Jobs',
          data: Object.values(this.statistics.jobsByExperienceLevel),
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


