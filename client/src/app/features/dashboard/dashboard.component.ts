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
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
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
    MatPaginatorModule,
    StatCardComponent,
    ChartComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private jobsService = inject(JobsService);
  
  // Track previous filter values to detect changes
  private previousFilters = {
    employmentType: '',
    workMode: '',
    experienceLevel: '',
    minSalary: null as number | null,
    maxSalary: null as number | null
  };
  
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
  allJobs: JobOffer[] = []; // All jobs from API (for client-side filtering/pagination)
  filteredJobs: JobOffer[] = []; // Jobs after client-side filtering
  displayedJobs: JobOffer[] = []; // Jobs for current page
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
  displayedCompanies: Company[] = [];
  companiesToShow = 6; // Show 6 companies initially
  showAllCompanies = false;
  
  // Pagination
  pageSize = 20;
  pageIndex = 0;
  totalJobsCount = 0;
  
  // Debounce timer for auto-search
  private searchDebounceTimer: any;
  
  // Track if user has searched
  hasSearched = false;
  
  ngOnInit() {
    // Don't load anything initially - just show search UI
  }
  
  ngAfterViewInit() {
    // Don't initialize map initially - wait for search
  }
  
  initMap() {
    if (!this.mapContainer?.nativeElement) {
      console.warn('Map container not found, retrying...');
      setTimeout(() => this.initMap(), 200);
      return;
    }
    
    // Don't reinitialize if map already exists
    if (this.map) {
      this.map.invalidateSize();
      return;
    }
    
    try {
      // Ensure container is visible
      const container = this.mapContainer.nativeElement;
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        setTimeout(() => this.initMap(), 200);
        return;
      }
      
      this.map = L.map(container, {
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true
      }).setView([46.6034, 1.8883], 6);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        tileSize: 256,
        zoomOffset: 0
      }).addTo(this.map);
      
      // Invalidate size after a short delay to ensure proper rendering
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          this.map.setView([46.6034, 1.8883], 6);
        }
      }, 200);
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
  
  
  onSearch() {
    // Clear any pending debounce
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    // If no search query or location, clear results
    if (!this.searchQuery && !this.searchLocation) {
      this.searchResults = null;
      this.allJobs = [];
      this.filteredJobs = [];
      this.displayedJobs = [];
      this.uniqueCompanies = [];
      this.hasSearched = false;
      this.statistics = null;
      this.heatMapData = null;
      if (this.map) {
        this.clearMap();
      }
      return;
    }
    
    this.hasSearched = true;
    this.searchLoading = true;
    this.pageIndex = 0; // Reset to first page on new search
    
    // Fetch ALL jobs without filters (backend will only filter by query/location)
    // We'll do client-side filtering for better performance
    this.jobsService.searchJobs({
      query: this.searchQuery || undefined,
      location: this.searchLocation || undefined,
      // Don't send filters - we'll filter client-side
      fetchAll: true // Fetch all results
    }).subscribe({
      next: (result) => {
        // Store all jobs
        this.allJobs = result.jobs || [];
        this.searchResults = result;
        
        // Apply client-side filtering
        this.applyClientSideFilters();
        
        this.searchLoading = false;
        
        // Smooth scroll to results after search
        setTimeout(() => {
          const resultsSection = document.getElementById('results-section') || document.querySelector('.results-section');
          if (resultsSection) {
            const offset = 80;
            const elementPosition = resultsSection.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            
            window.scrollTo({
              top: Math.max(0, offsetPosition),
              behavior: 'smooth'
            });
          }
        }, 200);
      },
      error: (err) => {
        console.error('Search error:', err);
        this.searchLoading = false;
      }
    });
  }
  
  // Apply client-side filters (instant, no API call)
  applyClientSideFilters() {
    if (this.allJobs.length === 0) {
      this.filteredJobs = [];
      this.displayedJobs = [];
      this.totalJobsCount = 0;
      this.uniqueCompanies = [];
      this.statistics = null;
      return;
    }
    
    // Filter jobs client-side
    let filtered = [...this.allJobs];
    
    if (this.employmentType) {
      filtered = filtered.filter(job => 
        job.employmentType && 
        job.employmentType.toLowerCase() === this.employmentType.toLowerCase()
      );
    }
    
    if (this.workMode) {
      filtered = filtered.filter(job => 
        job.workMode && 
        job.workMode.toLowerCase() === this.workMode.toLowerCase()
      );
    }
    
    if (this.experienceLevel) {
      filtered = filtered.filter(job => 
        job.experienceLevel && 
        job.experienceLevel.toLowerCase() === this.experienceLevel.toLowerCase()
      );
    }
    
    if (this.minSalary !== null && this.minSalary !== undefined) {
      filtered = filtered.filter(job => 
        job.salaryRange?.averageSalary && 
        job.salaryRange.averageSalary >= this.minSalary!
      );
    }
    
    if (this.maxSalary !== null && this.maxSalary !== undefined) {
      filtered = filtered.filter(job => 
        job.salaryRange?.averageSalary && 
        job.salaryRange.averageSalary <= this.maxSalary!
      );
    }
    
    this.filteredJobs = filtered;
    this.totalJobsCount = filtered.length;
    
    // Update pagination
    this.updatePagination();
    
        // Extract unique companies from filtered results
        const companyMap = new Map<string, Company>();
        filtered.forEach(job => {
          if (job.company && !companyMap.has(job.company.id)) {
            companyMap.set(job.company.id, job.company);
          }
        });
        this.uniqueCompanies = Array.from(companyMap.values());
        
        // Update displayed companies (show first 6)
        this.updateDisplayedCompanies();
        
        // Calculate statistics from filtered results (instant, no API call)
        this.calculateStatisticsFromFilteredJobs();
        
        // Update map with filtered job locations (async, don't wait)
        this.updateMapWithJobLocations();
  }
  
  // Update pagination (client-side)
  updatePagination() {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedJobs = this.filteredJobs.slice(startIndex, endIndex);
    
    // Update searchResults for compatibility
    if (this.searchResults) {
      this.searchResults.jobs = this.displayedJobs;
      this.searchResults.totalCount = this.totalJobsCount;
      this.searchResults.page = this.pageIndex + 1;
      this.searchResults.pageSize = this.pageSize;
    }
  }
  
  // Auto-apply filters when they change (instant, no API call)
  onFilterChange() {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    // Only apply filters if we have jobs loaded
    if (!this.hasSearched || this.allJobs.length === 0) {
      return;
    }
    
    // Check if filters actually changed
    const filtersChanged = 
      this.previousFilters.employmentType !== this.employmentType ||
      this.previousFilters.workMode !== this.workMode ||
      this.previousFilters.experienceLevel !== this.experienceLevel ||
      this.previousFilters.minSalary !== this.minSalary ||
      this.previousFilters.maxSalary !== this.maxSalary;
    
    if (!filtersChanged) {
      return;
    }
    
    // Apply filters instantly (no debounce needed for client-side filtering)
    this.applyClientSideFilters();
    
    // Update previous filters
    this.previousFilters = {
      employmentType: this.employmentType,
      workMode: this.workMode,
      experienceLevel: this.experienceLevel,
      minSalary: this.minSalary,
      maxSalary: this.maxSalary
    };
    
    // Smooth scroll to results when filters change (if results are visible)
    if (this.hasSearched && this.filteredJobs.length > 0) {
      setTimeout(() => {
        const resultsSection = document.getElementById('results-section') || document.querySelector('.results-section');
        if (resultsSection) {
          const offset = 80;
          const elementPosition = resultsSection.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;
          
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });
        }
      }, 50);
    }
  }
  
  // Statistics are now calculated directly from search results
  // No need for separate API call - faster and more accurate
  
  // Calculate statistics from filtered jobs (all filtered jobs, not just current page)
  calculateStatisticsFromFilteredJobs() {
    if (!this.filteredJobs || this.filteredJobs.length === 0) {
      this.statistics = this.getEmptyStatistics();
      // Force chart update with empty data
      setTimeout(() => {
        this.statistics = this.getEmptyStatistics();
      }, 0);
      return;
    }
    
    // Use all filtered jobs for accurate statistics
    const jobs = this.filteredJobs;
    const stats: JobStatistics = {
      totalJobs: jobs.length,
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
    
    // Calculate statistics from ALL jobs in current results
    // This ensures charts reflect the actual filtered data
    const salaries: number[] = [];
    const salariesByExp: { [key: string]: number[] } = {};
    const salariesByLoc: { [key: string]: number[] } = {};
    
    // Process all jobs to build accurate statistics
    jobs.forEach(job => {
      // Employment Type
      if (job.employmentType) {
        stats.jobsByEmploymentType[job.employmentType] = (stats.jobsByEmploymentType[job.employmentType] || 0) + 1;
      }
      
      // Work Mode
      if (job.workMode) {
        stats.jobsByWorkMode[job.workMode] = (stats.jobsByWorkMode[job.workMode] || 0) + 1;
      }
      
      // Experience Level
      if (job.experienceLevel) {
        stats.jobsByExperienceLevel[job.experienceLevel] = (stats.jobsByExperienceLevel[job.experienceLevel] || 0) + 1;
      }
      
      // Locations
      if (job.location?.city) {
        const locKey = `${job.location.city}, ${job.location.country || ''}`;
        stats.topLocations[locKey] = (stats.topLocations[locKey] || 0) + 1;
      }
      
      // Companies
      if (job.company?.name) {
        stats.topCompanies[job.company.name] = (stats.topCompanies[job.company.name] || 0) + 1;
      }
      
      // Salaries
      if (job.salaryRange?.averageSalary) {
        const salary = job.salaryRange.averageSalary;
        salaries.push(salary);
        
        if (job.experienceLevel) {
          if (!salariesByExp[job.experienceLevel]) {
            salariesByExp[job.experienceLevel] = [];
          }
          salariesByExp[job.experienceLevel].push(salary);
        }
        
        if (job.location?.city) {
          const locKey = `${job.location.city}, ${job.location.country || ''}`;
          if (!salariesByLoc[locKey]) {
            salariesByLoc[locKey] = [];
          }
          salariesByLoc[locKey].push(salary);
        }
      }
    });
    
    // Calculate salary statistics (rounded for display)
    if (salaries.length > 0) {
      salaries.sort((a, b) => a - b);
      stats.salaryStatistics.minSalary = Math.round(salaries[0]);
      stats.salaryStatistics.maxSalary = Math.round(salaries[salaries.length - 1]);
      stats.salaryStatistics.averageSalary = Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length);
      stats.salaryStatistics.medianSalary = Math.round(
        salaries.length % 2 === 0
          ? (salaries[salaries.length / 2 - 1] + salaries[salaries.length / 2]) / 2
          : salaries[Math.floor(salaries.length / 2)]
      );
    }
    
    // Average salary by experience (only if we have salary data)
    Object.keys(salariesByExp).forEach(exp => {
      const expSalaries = salariesByExp[exp];
      if (expSalaries.length > 0) {
        stats.salaryStatistics.averageSalaryByExperience[exp] = 
          Math.round(expSalaries.reduce((a, b) => a + b, 0) / expSalaries.length);
      }
    });
    
    // Average salary by location (only if we have salary data)
    Object.keys(salariesByLoc).forEach(loc => {
      const locSalaries = salariesByLoc[loc];
      if (locSalaries.length > 0) {
        stats.salaryStatistics.averageSalaryByLocation[loc] = 
          Math.round(locSalaries.reduce((a, b) => a + b, 0) / locSalaries.length);
      }
    });
    
    // Update statistics and force change detection
    this.statistics = { ...stats }; // Create new object to trigger change detection
    
    // Force Angular to detect changes for charts
    setTimeout(() => {
      // Charts will update via ngOnChanges when statistics change
    }, 0);
  }
  
  // Update map with job locations from filtered jobs (optimized and fast)
  async updateMapWithJobLocations() {
    // Don't update if no filtered jobs
    if (!this.filteredJobs || this.filteredJobs.length === 0) {
      if (this.map) {
        this.clearMap();
      }
      this.heatMapLoading = false;
      return;
    }
    
    // Ensure map container exists and is visible
    if (!this.mapContainer?.nativeElement) {
      setTimeout(() => this.updateMapWithJobLocations(), 100);
      return;
    }
    
    // Check if map container is visible
    const container = this.mapContainer.nativeElement;
    const isVisible = container.offsetWidth > 0 && container.offsetHeight > 0;
    if (!isVisible) {
      // Wait a bit and retry
      setTimeout(() => this.updateMapWithJobLocations(), 200);
      return;
    }
    
    // Initialize map if not already done
    if (!this.map) {
      this.initMap();
      // Wait for map to be ready
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    if (!this.map) {
      setTimeout(() => this.updateMapWithJobLocations(), 200);
      return;
    }
    
    this.heatMapLoading = true;
    
    // Clear existing markers immediately
    this.clearMap();
    
    // Invalidate map size to ensure proper rendering
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 50);
    
    // Group jobs by location (city + country) - optimized
    const locationMap = new Map<string, { jobs: JobOffer[], lat: number | null, lng: number | null, city: string, country: string, address: string }>();
    
    // Collect all unique locations from filtered jobs (fast, synchronous)
    for (const job of this.filteredJobs) {
      if (job.location && job.location.city) {
        const city = job.location.city;
        const country = job.location.country || 'Unknown';
        const region = job.location.region || '';
        const key = `${city},${country}`;
        
        // Build full address
        const addressParts = [city];
        if (region) addressParts.push(region);
        addressParts.push(country);
        const fullAddress = addressParts.join(', ');
        
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            jobs: [],
            lat: job.location.latitude || null,
            lng: job.location.longitude || null,
            city: city,
            country: country,
            address: fullAddress
          });
        }
        locationMap.get(key)!.jobs.push(job);
      }
    }
    
    // Only geocode locations without coordinates (use cached geocoding)
    const geocodePromises: Promise<void>[] = [];
    
    for (const [key, loc] of locationMap.entries()) {
      if (!loc.lat || !loc.lng) {
        geocodePromises.push(
          this.jobsService.geocodeLocation(loc.city, loc.country).then(coords => {
            if (coords) {
              loc.lat = coords.lat;
              loc.lng = coords.lng;
            }
          }).catch(() => {
            // Silent fail
          })
        );
      }
    }
    
    // Wait for geocoding with very short timeout (1 second for speed)
    if (geocodePromises.length > 0) {
      await Promise.race([
        Promise.all(geocodePromises),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
    }
    
    // Filter out locations without coordinates
    const locations = Array.from(locationMap.values()).filter(loc => loc.lat && loc.lng);
    
    if (locations.length === 0) {
      this.heatMapLoading = false;
      return;
    }
    
    // Calculate max values for normalization
    const maxJobCount = Math.max(...locations.map(l => l.jobs.length), 1);
    const maxSalary = Math.max(...locations.map(l => {
      const sals = l.jobs.filter(j => j.salaryRange?.averageSalary).map(j => j.salaryRange!.averageSalary!);
      return sals.length > 0 ? sals.reduce((a, b) => a + b, 0) / sals.length : 0;
    }), 1);
    
    // Add markers efficiently
    const markersToAdd: L.CircleMarker[] = [];
    
    locations.forEach(loc => {
      const jobCount = loc.jobs.length;
      const salaries = loc.jobs.filter(j => j.salaryRange?.averageSalary).map(j => j.salaryRange!.averageSalary!);
      const avgSalary = salaries.length > 0 
        ? salaries.reduce((sum, s) => sum + s, 0) / salaries.length
        : 0;
      
      const radius = Math.max(12, Math.min(jobCount * 2.5, 35));
      const intensity = this.mapType === 'jobs' 
        ? jobCount / maxJobCount
        : (avgSalary / maxSalary);
      
      // Better color scheme - green to red gradient
      const hue = 120 - (intensity * 120); // Green (low) to Red (high)
      const saturation = 70 + (intensity * 20); // More vibrant for higher values
      const lightness = 50 - (intensity * 10);
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      
      const marker = L.circleMarker([loc.lat!, loc.lng!], {
        radius: radius,
        fillColor: color,
        color: '#fff',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.8
      });
      
      const jobTitles = loc.jobs.slice(0, 5).map(j => `• ${j.title}`).join('<br>');
      const moreJobs = loc.jobs.length > 5 ? `<br><em style="color: #94a3b8;">...and ${loc.jobs.length - 5} more jobs</em>` : '';
      
      // Get unique job addresses for this location
      const jobAddresses = new Set<string>();
      loc.jobs.forEach(job => {
        if (job.location) {
          const addrParts = [job.location.city];
          if (job.location.region) addrParts.push(job.location.region);
          addrParts.push(job.location.country || '');
          const addr = addrParts.filter(p => p).join(', ');
          if (addr) jobAddresses.add(addr);
        }
      });
      const addressesList = Array.from(jobAddresses).slice(0, 3).map(addr => `📍 ${addr}`).join('<br>');
      const moreAddresses = jobAddresses.size > 3 ? `<br><em style="color: #94a3b8;">...and ${jobAddresses.size - 3} more locations</em>` : '';
      
      const popupContent = `
        <div style="padding: 16px; min-width: 300px; max-width: 450px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="border-bottom: 2px solid #667eea; padding-bottom: 12px; margin-bottom: 12px;">
            <strong style="font-size: 18px; color: #1e293b; display: block; margin-bottom: 4px;">
              📍 ${loc.address}
            </strong>
            <span style="font-size: 13px; color: #64748b;">${loc.city}, ${loc.country}</span>
          </div>
          <div style="margin: 12px 0; padding: 12px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; border-left: 4px solid #667eea;">
            <div style="font-size: 14px; color: #475569; margin-bottom: 6px;">
              <strong style="color: #667eea; font-size: 20px;">${jobCount}</strong> job${jobCount !== 1 ? 's' : ''} available
            </div>
            ${avgSalary > 0 ? `
            <div style="font-size: 13px; color: #10b981; margin-top: 6px;">
              💰 Avg Salary: <strong>${avgSalary.toFixed(0).toLocaleString()} EUR/year</strong>
            </div>
            ` : ''}
          </div>
          ${jobAddresses.size > 0 ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
            <strong style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Job Addresses:</strong>
            <div style="margin-top: 8px; font-size: 12px; color: #475569; line-height: 1.6;">
              ${addressesList}${moreAddresses}
            </div>
          </div>
          ` : ''}
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
            <strong style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Sample Jobs:</strong>
            <div style="margin-top: 10px; font-size: 13px; color: #475569; line-height: 1.8;">
              ${jobTitles}${moreJobs}
            </div>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent, {
        maxWidth: 400,
        className: 'custom-popup'
      });
      
      markersToAdd.push(marker);
      this.markers.push(marker as any);
    });
    
    // Add all markers at once (more efficient)
    markersToAdd.forEach(marker => {
      marker.addTo(this.map!);
    });
    
    // Fit map to show all markers with smooth animation (fast)
    if (this.markers.length > 0) {
      const group = new L.FeatureGroup(this.markers as any);
      const bounds = group.getBounds();
      
      // Only fit bounds if we have valid bounds
      if (bounds.isValid()) {
        // Use requestAnimationFrame for smoother updates
        requestAnimationFrame(() => {
          if (this.map) {
            this.map.fitBounds(bounds.pad(0.1), {
              animate: true,
              duration: 0.4,
              maxZoom: 12,
              padding: [50, 50]
            });
          }
        });
      }
    }
    
    // Ensure map is properly sized
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 100);
    
    this.heatMapLoading = false;
  }
  
  clearMap() {
    if (this.map) {
      this.markers.forEach(marker => {
        this.map!.removeLayer(marker as any);
      });
      this.markers = [];
    }
  }
  
  
  // Handle pagination (client-side, no API call)
  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    
    // Update displayed jobs (client-side pagination)
    this.updatePagination();
    
    // Don't scroll - let user stay where they are for better UX
    // Only scroll if they're at the top of the page
    if (window.scrollY < 200) {
      setTimeout(() => {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
          const offset = 100;
          const elementPosition = resultsSection.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;
          
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });
        }
      }, 50);
    }
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
    this.allJobs = [];
    this.filteredJobs = [];
    this.displayedJobs = [];
    this.uniqueCompanies = [];
    this.displayedCompanies = [];
    this.companiesToShow = 6;
    this.showAllCompanies = false;
    this.pageIndex = 0;
    this.totalJobsCount = 0;
    this.hasSearched = false;
    this.statistics = null;
    this.heatMapData = null;
    if (this.map) {
      this.clearMap();
    }
  }
  
  onMapTypeChange() {
    if (this.hasSearched && this.filteredJobs.length > 0) {
      // Update map immediately when type changes (fast, no geocoding needed)
      // Markers already exist, just need to recalculate colors
      this.updateMapWithJobLocations();
    }
  }
  
  // Chart data methods - All changed to bar/column charts with accurate data
  getEmploymentTypeChartData() {
    if (!this.statistics?.jobsByEmploymentType) return null;
    const data = this.statistics.jobsByEmploymentType;
    if (Object.keys(data).length === 0) return null;
    
    // Filter out zero values and sort by value descending
    const filtered = Object.entries(data).filter(([, value]) => (value as number) > 0);
    if (filtered.length === 0) return null;
    
    const sorted = filtered.sort(([, a], [, b]) => (b as number) - (a as number));
    
    return {
      type: 'bar',
      title: { text: 'Employment Type Distribution' },
      data: {
        labels: sorted.map(([key]) => key),
        datasets: [{
          label: 'Number of Jobs',
          data: sorted.map(([, value]) => value as number),
          backgroundColor: '#667eea'
        }]
      },
      options: {
        yAxis: { name: 'Number of Jobs' }
      }
    };
  }
  
  getWorkModeChartData() {
    if (!this.statistics?.jobsByWorkMode) return null;
    const data = this.statistics.jobsByWorkMode;
    if (Object.keys(data).length === 0) return null;
    
    // Filter out zero values and sort by value descending
    const filtered = Object.entries(data).filter(([, value]) => (value as number) > 0);
    if (filtered.length === 0) return null;
    
    const sorted = filtered.sort(([, a], [, b]) => (b as number) - (a as number));
    
    return {
      type: 'bar',
      title: { text: 'Work Mode Analysis' },
      data: {
        labels: sorted.map(([key]) => key),
        datasets: [{
          label: 'Number of Jobs',
          data: sorted.map(([, value]) => value as number),
          backgroundColor: '#764ba2'
        }]
      },
      options: {
        yAxis: { name: 'Number of Jobs' }
      }
    };
  }
  
  getExperienceLevelChartData() {
    if (!this.statistics?.jobsByExperienceLevel) return null;
    const data = this.statistics.jobsByExperienceLevel;
    if (Object.keys(data).length === 0) return null;
    
    // Filter out zero values and sort by value descending
    const filtered = Object.entries(data).filter(([, value]) => (value as number) > 0);
    if (filtered.length === 0) return null;
    
    const sorted = filtered.sort(([, a], [, b]) => (b as number) - (a as number));
    
    return {
      type: 'bar',
      title: { text: 'Experience Level Distribution' },
      data: {
        labels: sorted.map(([key]) => key),
        datasets: [{
          label: 'Number of Jobs',
          data: sorted.map(([, value]) => value as number),
          backgroundColor: '#f093fb'
        }]
      },
      options: {
        yAxis: { name: 'Number of Jobs' }
      }
    };
  }
  
  getSalaryChartData() {
    if (!this.statistics?.salaryStatistics?.averageSalaryByExperience) return null;
    const data = this.statistics.salaryStatistics.averageSalaryByExperience;
    if (Object.keys(data).length === 0) return null;
    
    // Filter out zero/null values
    const filtered = Object.entries(data).filter(([, value]) => value && (value as number) > 0);
    if (filtered.length === 0) return null;
    
    // Sort by experience level order (Junior, Mid, Senior, Lead, Any)
    const experienceOrder = ['Junior', 'Mid', 'Senior', 'Lead', 'Any'];
    const sorted = filtered.sort(([keyA], [keyB]) => {
      const indexA = experienceOrder.indexOf(keyA);
      const indexB = experienceOrder.indexOf(keyB);
      if (indexA === -1 && indexB === -1) return keyA.localeCompare(keyB);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    return {
      type: 'bar',
      title: { text: 'Average Salary by Experience Level' },
      data: {
        labels: sorted.map(([key]) => key),
        datasets: [{
          label: 'Average Salary (EUR/year)',
          data: sorted.map(([, value]) => Math.round(value as number)),
          backgroundColor: '#4facfe'
        }]
      },
      options: {
        yAxis: { name: 'Salary (EUR/year)' }
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
    if (!this.filteredJobs) return 0;
    return this.filteredJobs.filter(job => job.company?.id === companyId).length;
  }
  
  // Update displayed companies (show 6 at a time)
  updateDisplayedCompanies() {
    if (this.showAllCompanies) {
      this.displayedCompanies = [...this.uniqueCompanies];
    } else {
      this.displayedCompanies = this.uniqueCompanies.slice(0, this.companiesToShow);
    }
  }
  
  // Show more companies
  showMoreCompanies() {
    this.companiesToShow += 6;
    this.updateDisplayedCompanies();
    
    // If we've shown all, hide the button
    if (this.companiesToShow >= this.uniqueCompanies.length) {
      this.showAllCompanies = true;
    }
  }
  
  // Check if there are more companies to show
  hasMoreCompanies(): boolean {
    return this.uniqueCompanies.length > this.companiesToShow;
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
