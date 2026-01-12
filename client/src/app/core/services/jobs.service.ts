import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { JobOffer, SearchJobMarketResult } from '../models/job-offer.model';
import { JobStatistics, SalaryStatistics, HeatMapData, TrendData } from '../models/statistics.model';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root'
})
export class JobsService {
  private http = inject(HttpClient);
  private cacheService = inject(CacheService);
  private apiUrl = (typeof window !== 'undefined' && (window as any).API_URL) 
    ? `${(window as any).API_URL}/api/jobs`
    : 'http://localhost:5190/api/jobs';
  
  // Geocoding cache (longer TTL since locations don't change)
  private geocodeCache = new Map<string, { lat: number, lng: number, timestamp: number }>();
  private readonly GEOCODE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  searchJobs(params: {
    query?: string;
    location?: string;
    employmentType?: string;
    workMode?: string;
    experienceLevel?: string;
    minSalary?: number;
    maxSalary?: number;
    page?: number;
    pageSize?: number;
    fetchAll?: boolean; // If true, fetch all results for client-side pagination
  }): Observable<SearchJobMarketResult> {
    // For client-side pagination, we fetch ALL results (no filters, large pageSize)
    // Cache key only includes query and location (filters applied client-side)
    const baseCacheKey = `search:${params.query || ''}:${params.location || ''}`;
    
    // Check cache first
    const cached = this.cacheService.get<SearchJobMarketResult>(baseCacheKey);
    if (cached && params.fetchAll) {
      // Return cached full results
      return of(cached);
    }
    
    let httpParams = new HttpParams();
    
    // Only send query and location to backend (filters applied client-side)
    if (params.query) httpParams = httpParams.set('query', params.query);
    if (params.location) httpParams = httpParams.set('location', params.location);
    
    // Fetch large number of results for client-side filtering/pagination
    const fetchSize = params.fetchAll ? 500 : (params.pageSize || 20);
    httpParams = httpParams.set('page', '1');
    httpParams = httpParams.set('pageSize', fetchSize.toString());

    return this.http.get<SearchJobMarketResult>(`${this.apiUrl}/search`, { params: httpParams })
      .pipe(
        tap(result => {
          // Cache full results for 5 minutes (longer since we fetch all)
          if (params.fetchAll) {
            this.cacheService.set(baseCacheKey, result, 5 * 60 * 1000);
          }
        })
      );
  }

  getStatistics(params?: {
    location?: string;
    employmentType?: string;
    workMode?: string;
    fromDate?: string;
    toDate?: string;
  }): Observable<JobStatistics> {
    const cacheKey = `stats:${params?.location || ''}:${params?.employmentType || ''}:${params?.workMode || ''}`;
    
    const cached = this.cacheService.get<JobStatistics>(cacheKey);
    if (cached) {
      return of(cached);
    }
    
    let httpParams = new HttpParams();
    if (params) {
      if (params.location) httpParams = httpParams.set('location', params.location);
      if (params.employmentType) httpParams = httpParams.set('employmentType', params.employmentType);
      if (params.workMode) httpParams = httpParams.set('workMode', params.workMode);
      if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
      if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    }
    return this.http.get<JobStatistics>(`${this.apiUrl}/statistics`, { params: httpParams })
      .pipe(
        tap(result => {
          // Cache for 5 minutes
          this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
        })
      );
  }
  
  // Geocode location with caching
  async geocodeLocation(city: string, country: string): Promise<{ lat: number, lng: number } | null> {
    const cacheKey = `${city},${country}`;
    const cached = this.geocodeCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.GEOCODE_TTL) {
      return { lat: cached.lat, lng: cached.lng };
    }
    
    try {
      const query = encodeURIComponent(`${city}, ${country}`);
      const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MarketPulse Jobs App'
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      if (data && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        
        // Cache the result
        this.geocodeCache.set(cacheKey, {
          ...coords,
          timestamp: Date.now()
        });
        
        return coords;
      }
    } catch (error) {
      console.warn('Geocoding error:', error);
    }
    return null;
  }

  getSalaryAnalytics(params?: {
    location?: string;
    experienceLevel?: string;
    employmentType?: string;
  }): Observable<SalaryStatistics> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.location) httpParams = httpParams.set('location', params.location);
      if (params.experienceLevel) httpParams = httpParams.set('experienceLevel', params.experienceLevel);
      if (params.employmentType) httpParams = httpParams.set('employmentType', params.employmentType);
    }
    return this.http.get<SalaryStatistics>(`${this.apiUrl}/salaries`, { params: httpParams });
  }

  getHeatMapData(country?: string, dataType: string = 'jobs'): Observable<HeatMapData> {
    let httpParams = new HttpParams().set('dataType', dataType);
    if (country) httpParams = httpParams.set('country', country);
    return this.http.get<HeatMapData>(`${this.apiUrl}/heatmap`, { params: httpParams });
  }

  getTrends(params?: {
    location?: string;
    category?: string;
    days?: number;
  }): Observable<TrendData> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.location) httpParams = httpParams.set('location', params.location);
      if (params.category) httpParams = httpParams.set('category', params.category);
      if (params.days) httpParams = httpParams.set('days', params.days.toString());
    }
    return this.http.get<TrendData>(`${this.apiUrl}/trends`, { params: httpParams });
  }
}


