import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobsService } from '../../core/services/jobs.service';
import { JobStatistics, HeatMapData } from '../../core/models/statistics.model';
import { JobOffer, SearchJobMarketResult, Company } from '../../core/models/job-offer.model';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import * as L from 'leaflet';

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
    MatChipsModule,
    StatCardComponent,
    ChartComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private jobsService = inject(JobsService);
  
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  
  // Search and filters
  searchQuery: string = '';
  searchLocation: string = '';
  employmentType: string = '';
  workMode: string = '';
  experienceLevel: string = '';
  minSalary: number | null = null;
  maxSalary: number | null = null;
  
  // Data
  statistics: JobStatistics | null = null;
  searchResults: SearchJobMarketResult | null = null;
  heatMapData: HeatMapData | null = null;
  
  // Loading states
  loading = false;
  searchLoading = false;
  heatMapLoading = false;
  
  // Map
  private map: L.Map | null = null;
  private markers: (L.CircleMarker | L.Marker)[] = [];
  mapType: 'jobs' | 'salary' = 'jobs';
  
  // Filter options
  employmentTypes = ['CDI', 'CDD', 'Freelance', 'Internship', 'Other'];
  workModes = ['Remote', 'Hybrid', 'Onsite', 'Flexible'];
  experienceLevels = ['Junior', 'Mid', 'Senior', 'Lead', 'Any'];
  
  // Computed data
  uniqueCompanies: Company[] = [];
  
  ngOnInit() {
    this.loadStatistics();
  }
  
  ngAfterViewInit() {
    // Initialize map after view is ready
    setTimeout(() => {
      this.initMap();
      this.loadHeatMapData();
    }, 100);
  }
  
  initMap() {
    if (!this.mapContainer?.nativeElement) {
      console.warn('Map container not found');
      return;
    }
    
    try {
      this.map = L.map(this.mapContainer.nativeElement).setView([46.6034, 1.8883], 6);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);
      
      if (this.heatMapData) {
        this.updateMap();
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }
  
  loadStatistics() {
    this.loading = true;
    this.jobsService.getStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading statistics:', err);
        this.statistics = this.getEmptyStatistics();
        this.loading = false;
      }
    });
  }
  
  loadHeatMapData() {
    this.heatMapLoading = true;
    this.jobsService.getHeatMapData(undefined, this.mapType).subscribe({
      next: (data) => {
        this.heatMapData = data;
        this.heatMapLoading = false;
        if (this.map) {
          this.updateMap();
        }
      },
      error: (err) => {
        console.error('Error loading heatmap:', err);
        this.heatMapLoading = false;
      }
    });
  }
  
  updateMap() {
    if (!this.map || !this.heatMapData) return;
    
    // Clear existing markers
    this.markers.forEach(marker => {
      if (this.map) {
        this.map.removeLayer(marker as any);
      }
    });
    this.markers = [];
    
    // Add markers
    this.heatMapData.points.forEach(point => {
      const intensity = point.intensity / 100;
      const color = this.mapType === 'jobs' 
        ? `rgba(25, 118, 210, ${intensity})`
        : `rgba(66, 165, 245, ${intensity})`;
      
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: Math.max(5, point.jobCount / 10),
        fillColor: color,
        color: '#1976d2',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.6
      });
      
      const popupContent = `
        <div style="padding: 8px;">
          <strong>${point.city}, ${point.country}</strong><br>
          Jobs: ${point.jobCount}<br>
          ${point.averageSalary ? `Avg Salary: ${point.averageSalary.toFixed(0)} EUR/year` : ''}
        </div>
      `;
      
      marker.bindPopup(popupContent);
      marker.addTo(this.map!);
      this.markers.push(marker as any);
    });
  }
  
  onSearch() {
    if (!this.searchQuery && !this.searchLocation) {
      return;
    }
    
    this.searchLoading = true;
    
    this.jobsService.searchJobs({
      query: this.searchQuery || undefined,
      location: this.searchLocation || undefined,
      employmentType: this.employmentType || undefined,
      workMode: this.workMode || undefined,
      experienceLevel: this.experienceLevel || undefined,
      minSalary: this.minSalary || undefined,
      maxSalary: this.maxSalary || undefined,
      page: 1,
      pageSize: 100
    }).subscribe({
      next: (result) => {
        this.searchResults = result;
        this.searchLoading = false;
        
        // Extract unique companies
        const companyMap = new Map<string, Company>();
        result.jobs.forEach(job => {
          if (job.company && !companyMap.has(job.company.id)) {
            companyMap.set(job.company.id, job.company);
          }
        });
        this.uniqueCompanies = Array.from(companyMap.values());
        
        // Load statistics for search results
        this.loadStatistics();
        this.loadHeatMapData();
      },
      error: (err) => {
        console.error('Search error:', err);
        this.searchLoading = false;
      }
    });
  }
  
  clearFilters() {
    this.searchQuery = '';
    this.searchLocation = '';
    this.employmentType = '';
    this.workMode = '';
    this.experienceLevel = '';
    this.minSalary = null;
    this.maxSalary = null;
    this.searchResults = null;
    this.uniqueCompanies = [];
    this.loadStatistics();
  }
  
  onMapTypeChange() {
    this.loadHeatMapData();
  }
  
  // Chart data methods
  getEmploymentTypeChartData() {
    if (!this.statistics?.jobsByEmploymentType) return null;
    const data = this.statistics.jobsByEmploymentType;
    if (Object.keys(data).length === 0) return null;
    
    return {
      type: 'pie',
      data: {
        labels: Object.keys(data),
        datasets: [{
          data: Object.values(data),
          backgroundColor: ['#2196f3', '#9c27b0', '#00bcd4', '#4caf50', '#ff9800']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Employment Type Distribution'
          }
        }
      }
    };
  }
  
  getWorkModeChartData() {
    if (!this.statistics?.jobsByWorkMode) return null;
    const data = this.statistics.jobsByWorkMode;
    if (Object.keys(data).length === 0) return null;
    
    return {
      type: 'pie',
      data: {
        labels: Object.keys(data),
        datasets: [{
          data: Object.values(data),
          backgroundColor: ['#2196f3', '#9c27b0', '#00bcd4', '#4caf50']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Work Mode Analysis'
          }
        }
      }
    };
  }
  
  getExperienceLevelChartData() {
    if (!this.statistics?.jobsByExperienceLevel) return null;
    const data = this.statistics.jobsByExperienceLevel;
    if (Object.keys(data).length === 0) return null;
    
    return {
      type: 'pie',
      data: {
        labels: Object.keys(data),
        datasets: [{
          data: Object.values(data),
          backgroundColor: ['#2196f3', '#9c27b0', '#00bcd4', '#4caf50', '#ff9800']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Experience Level Distribution'
          }
        }
      }
    };
  }
  
  getSalaryChartData() {
    if (!this.statistics?.salaryStatistics?.averageSalaryByExperience) return null;
    const data = this.statistics.salaryStatistics.averageSalaryByExperience;
    if (Object.keys(data).length === 0) return null;
    
    return {
      type: 'bar',
      data: {
        labels: Object.keys(data),
        datasets: [{
          label: 'Average Salary (EUR/year)',
          data: Object.values(data),
          backgroundColor: '#2196f3'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Salary by Experience Level'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value: any) {
                return value.toLocaleString() + ' €';
              }
            }
          }
        }
      }
    };
  }
  
  getTopCompanies() {
    if (!this.statistics?.topCompanies) return [];
    return Object.entries(this.statistics.topCompanies)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }
  
  getTopLocationsCount(): number {
    if (!this.statistics?.topLocations) return 0;
    return Object.keys(this.statistics.topLocations).length;
  }
  
  getCompanyJobCount(companyId: string): number {
    if (!this.searchResults?.jobs) return 0;
    return this.searchResults.jobs.filter(job => job.company?.id === companyId).length;
  }
  
  private getEmptyStatistics(): JobStatistics {
    return {
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
  }
}
