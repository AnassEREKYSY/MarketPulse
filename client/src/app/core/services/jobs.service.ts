import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobOffer, SearchJobMarketResult } from '../models/job-offer.model';
import { JobStatistics, SalaryStatistics, HeatMapData, TrendData } from '../models/statistics.model';

@Injectable({
  providedIn: 'root'
})
export class JobsService {
  private http = inject(HttpClient);
  private apiUrl = (typeof window !== 'undefined' && (window as any).API_URL) 
    ? `${(window as any).API_URL}/api/jobs`
    : 'http://localhost:5190/api/jobs';

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
  }): Observable<SearchJobMarketResult> {
    let httpParams = new HttpParams();
    
    if (params.query) httpParams = httpParams.set('query', params.query);
    if (params.location) httpParams = httpParams.set('location', params.location);
    if (params.employmentType) httpParams = httpParams.set('employmentType', params.employmentType);
    if (params.workMode) httpParams = httpParams.set('workMode', params.workMode);
    if (params.experienceLevel) httpParams = httpParams.set('experienceLevel', params.experienceLevel);
    if (params.minSalary) httpParams = httpParams.set('minSalary', params.minSalary.toString());
    if (params.maxSalary) httpParams = httpParams.set('maxSalary', params.maxSalary.toString());
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());

    return this.http.get<SearchJobMarketResult>(`${this.apiUrl}/search`, { params: httpParams });
  }

  getStatistics(params?: {
    location?: string;
    employmentType?: string;
    workMode?: string;
    fromDate?: string;
    toDate?: string;
  }): Observable<JobStatistics> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.location) httpParams = httpParams.set('location', params.location);
      if (params.employmentType) httpParams = httpParams.set('employmentType', params.employmentType);
      if (params.workMode) httpParams = httpParams.set('workMode', params.workMode);
      if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
      if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    }
    return this.http.get<JobStatistics>(`${this.apiUrl}/statistics`, { params: httpParams });
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


