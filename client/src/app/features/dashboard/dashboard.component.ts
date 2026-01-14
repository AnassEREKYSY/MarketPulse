import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Subject, EMPTY } from 'rxjs';
import { JobsService } from '../../core/services/jobs.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { UiStateService } from '../../core/services/ui-state.service';
import { JobStatistics, HeatMapData } from '../../core/models/statistics.model';
import { JobOffer, SearchJobMarketResult, Company } from '../../core/models/job-offer.model';
import { ChartConfig } from '../../core/services/analytics.service';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatPaginatorModule,
    MatSnackBarModule,
    StatCardComponent,
    ChartComponent,
    EmptyStateComponent,
    SkeletonLoaderComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private jobsService = inject(JobsService);
  private analyticsService = inject(AnalyticsService);
  private uiStateService = inject(UiStateService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  
  // Reactive form for all filters and search
  filtersForm: FormGroup;
  
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  
  // Typed getters for form values (for backward compatibility and type safety)
  get query(): string {
    return this.filtersForm?.get('query')?.value || '';
  }
  
  get location(): string {
    return this.filtersForm?.get('location')?.value || '';
  }
  
  get employmentType(): string {
    return this.filtersForm?.get('employmentType')?.value || '';
  }
  
  get workMode(): string {
    return this.filtersForm?.get('workMode')?.value || '';
  }
  
  get experienceLevel(): string {
    return this.filtersForm?.get('experienceLevel')?.value || '';
  }
  
  get minSalary(): number | null {
    const value = this.filtersForm?.get('minSalary')?.value;
    return value !== null && value !== undefined && value !== '' ? Number(value) : null;
  }
  
  get maxSalary(): number | null {
    const value = this.filtersForm?.get('maxSalary')?.value;
    return value !== null && value !== undefined && value !== '' ? Number(value) : null;
  }
  
  get mapType(): 'jobs' | 'salary' {
    return this.filtersForm?.get('mapType')?.value || 'jobs';
  }
  
  // Data
  statistics: JobStatistics | null = null;
  searchResults: SearchJobMarketResult | null = null;
  allJobs: JobOffer[] = []; // All jobs from API (for client-side filtering/pagination)
  filteredJobs: JobOffer[] = []; // Jobs after client-side filtering
  displayedJobs: JobOffer[] = []; // Jobs for current page
  heatMapData: HeatMapData | null = null;
  
  // Chart configurations
  employmentTypeChartConfig: ChartConfig | null = null;
  workModeChartConfig: ChartConfig | null = null;
  experienceLevelChartConfig: ChartConfig | null = null;
  salaryChartConfig: ChartConfig | null = null;
  
  // Data quality
  dataQualityWarning: string | null = null;
  
  // Loading states
  loading = false;
  searchLoading = false;
  heatMapLoading = false;
  
  // Map
  private map: L.Map | null = null;
  private markers: (L.CircleMarker | L.Marker)[] = [];
  
  // Filter options
  employmentTypes = ['CDI', 'CDD', 'Freelance', 'Internship', 'Other'];
  workModes = ['Remote', 'Hybrid', 'Onsite', 'Flexible'];
  experienceLevels = ['Junior', 'Mid', 'Senior', 'Lead'];
  
  // Empty state flag
  hasNoResults = false;
  
  // Computed data
  uniqueCompanies: Company[] = [];
  displayedCompanies: Company[] = [];
  companiesToShow = 6; // Show 6 companies initially
  showAllCompanies = false;
  
  // Pagination
  pageSize = 20;
  pageIndex = 0;
  totalJobsCount = 0;
  
  // Track if user has searched
  hasSearched = false;
  
  // Subject for search requests (for switchMap optimization)
  private searchSubject = new Subject<{ query?: string; location?: string }>();
  
  constructor() {
    // Initialize reactive form with all filters and search fields
    this.filtersForm = this.fb.group({
      query: [''],
      location: [''],
      employmentType: [''],
      workMode: [''],
      experienceLevel: [''],
      minSalary: [null],
      maxSalary: [null],
      mapType: ['jobs' as 'jobs' | 'salary']
    });
  }
  
  ngOnInit() {
    // Don't load anything initially - just show search UI
    
    // Subscribe to search requests with switchMap (cancels previous requests)
    this.searchSubject
      .pipe(
        debounceTime(300), // Debounce search requests
        distinctUntilChanged((prev: { query?: string; location?: string }, curr: { query?: string; location?: string }) => {
          return prev.query === curr.query && prev.location === curr.location;
        }),
        switchMap(({ query, location }: { query?: string; location?: string }) => {
          if (!query && !location) {
            return EMPTY;
          }
          
          this.searchLoading = true;
          this.hasSearched = true;
          this.pageIndex = 0;
          this.cdr.markForCheck();
          
          return this.jobsService.searchJobs({
            query: query || undefined,
            location: location || undefined,
            fetchAll: true
          }).pipe(
            catchError((error) => {
              console.error('Search error:', error);
              this.uiStateService.showError('Failed to search jobs. Please try again.');
              this.searchLoading = false;
              this.cdr.markForCheck();
              return EMPTY;
            })
          );
        })
      )
      .subscribe({
        next: (result: SearchJobMarketResult) => {
          this.allJobs = result.jobs || [];
          this.searchResults = result;
          this.searchLoading = false;
          
          // Apply client-side filtering
          this.applyClientSideFilters();
          
          this.cdr.markForCheck();
        }
      });
    
    // Subscribe to filter changes with debouncing (excluding query and location which trigger search)
    this.filtersForm.valueChanges
      .pipe(
        debounceTime(250), // 250ms debounce for smooth UX
        distinctUntilChanged((prev, curr) => {
          // Only debounce filter changes, not search query/location
          const prevFilters = {
            employmentType: prev.employmentType,
            workMode: prev.workMode,
            experienceLevel: prev.experienceLevel,
            minSalary: prev.minSalary,
            maxSalary: prev.maxSalary,
            mapType: prev.mapType
          };
          const currFilters = {
            employmentType: curr.employmentType,
            workMode: curr.workMode,
            experienceLevel: curr.experienceLevel,
            minSalary: curr.minSalary,
            maxSalary: curr.maxSalary,
            mapType: curr.mapType
          };
          return JSON.stringify(prevFilters) === JSON.stringify(currFilters);
        })
      )
      .subscribe((formValue) => {
        // If query or location changed, don't auto-apply filters (user needs to click search)
        // Only auto-apply if we already have search results
        if (this.hasSearched && this.allJobs.length > 0) {
          // Check if only filters changed (not query/location)
          const queryChanged = formValue.query !== this.query || formValue.location !== this.location;
          if (!queryChanged) {
            this.applyClientSideFilters();
          }
        }
        
        // Handle mapType change separately
        if (formValue.mapType !== this.mapType && this.hasSearched && this.filteredJobs.length > 0) {
          this.onMapTypeChange();
        }
      });
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
    // Get values from reactive form
    const query = this.query;
    const location = this.location;
    
    // If no search query or location, clear results
    if (!query && !location) {
      this.searchResults = null;
      this.allJobs = [];
      this.filteredJobs = [];
      this.displayedJobs = [];
      this.uniqueCompanies = [];
      this.displayedCompanies = [];
      this.hasSearched = false;
      this.statistics = null;
      this.heatMapData = null;
      if (this.map) {
        this.clearMap();
      }
      this.cdr.markForCheck();
      return;
    }
    
    // Emit search request to subject (will be handled by switchMap in ngOnInit)
    this.searchSubject.next({ query, location });
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
  
  // Filter changes are now handled by reactive form subscription
  // This method is kept for template compatibility but does nothing
  onFilterChange(): void {
    // Handled by reactive form subscription
  }
  
  // Statistics are now calculated directly from search results
  // No need for separate API call - faster and more accurate
  
  // Calculate statistics from filtered jobs using analytics service
  calculateStatisticsFromFilteredJobs() {
    if (!this.filteredJobs || this.filteredJobs.length === 0) {
      this.statistics = this.getEmptyStatistics();
      this.employmentTypeChartConfig = null;
      this.workModeChartConfig = null;
      this.experienceLevelChartConfig = null;
      this.salaryChartConfig = null;
      this.dataQualityWarning = null;
      this.hasNoResults = true;
      
      // Show notification if filters are active
      if (this.hasActiveFilters()) {
        this.uiStateService.showWarning('No results match your current filters');
      } else if (this.hasSearched) {
        this.uiStateService.showInfo('No jobs found for your search criteria');
      }
      
      this.cdr.markForCheck();
      return;
    }
    
    this.hasNoResults = false;
    
    // Use analytics service to calculate statistics and generate charts
    const analytics = this.analyticsService.analyzeJobs(this.filteredJobs);
    
    // Update statistics
    this.statistics = analytics.statistics;
    
    // Update chart configurations
    this.employmentTypeChartConfig = analytics.charts.employmentType || null;
    this.workModeChartConfig = analytics.charts.workMode || null;
    this.experienceLevelChartConfig = analytics.charts.experienceLevel || null;
    this.salaryChartConfig = analytics.charts.salaryByExperience || null;
    
    // Update data quality warning
    this.dataQualityWarning = this.analyticsService.getQualityWarning(analytics.quality);
    
    // Show partial data warning if needed
    if (analytics.quality.hasLimitedSample && !analytics.quality.hasInsufficientSalaryData) {
      // Already handled by dataQualityWarning
    }
    
    this.cdr.markForCheck();
  }
  
  // Check if any filters are active
  hasActiveFilters(): boolean {
    return !!(this.employmentType || this.workMode || this.experienceLevel || 
              this.minSalary || this.maxSalary);
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
    
    // No scroll-linked positioning - user stays where they are
    this.cdr.markForCheck();
  }
  
  // TrackBy functions for performance
  trackByJobId(index: number, job: JobOffer): string {
    return job.id;
  }
  
  trackByCompanyId(index: number, company: Company): string {
    return company.id;
  }
  
  trackByLabel(index: number, item: [string, number]): string {
    return item[0];
  }
  
  clearFilters() {
    // Reset reactive form (all fields except mapType)
    this.filtersForm.patchValue({
      query: '',
      location: '',
      employmentType: '',
      workMode: '',
      experienceLevel: '',
      minSalary: null,
      maxSalary: null
    }, { emitEvent: false }); // Don't trigger valueChanges
    
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
    this.hasNoResults = false;
    this.statistics = null;
    this.heatMapData = null;
    if (this.map) {
      this.clearMap();
    }
    
    this.cdr.markForCheck();
  }
  
  onMapTypeChange() {
    if (this.hasSearched && this.filteredJobs.length > 0) {
      // Update map immediately when type changes (fast, no geocoding needed)
      // Markers already exist, just need to recalculate colors
      this.updateMapWithJobLocations();
      this.cdr.markForCheck();
    }
  }
  
  // Chart data methods - now using pre-built chart configurations
  getEmploymentTypeChartData() {
    return this.employmentTypeChartConfig;
  }
  
  getWorkModeChartData() {
    return this.workModeChartConfig;
  }
  
  getExperienceLevelChartData() {
    return this.experienceLevelChartConfig;
  }
  
  getSalaryChartData() {
    return this.salaryChartConfig;
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
    // Count unique cities (normalized, lowercase, trimmed)
    const uniqueCities = new Set<string>();
    Object.keys(this.statistics.topLocations).forEach(loc => {
      const city = loc.split(',')[0]?.trim().toLowerCase();
      if (city) {
        uniqueCities.add(city);
      }
    });
    return uniqueCities.size;
  }
  
  getAverageSalary(): string {
    if (!this.statistics?.salaryStatistics?.averageSalary) {
      return 'Insufficient data';
    }
    const salary = this.statistics.salaryStatistics.averageSalary;
    if (salary === null || salary === undefined || isNaN(salary) || salary <= 0) {
      return 'Insufficient data';
    }
    return this.analyticsService.formatSalary(salary);
  }
  
  // Format helpers for stat cards
  getTotalJobs(): number | string {
    if (!this.statistics) {
      return 0;
    }
    return this.statistics.totalJobs || 0;
  }
  
  getCompaniesCount(): number {
    return this.uniqueCompanies.length || 0;
  }
  
  getLocationsCount(): number {
    return this.getTopLocationsCount() || 0;
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
