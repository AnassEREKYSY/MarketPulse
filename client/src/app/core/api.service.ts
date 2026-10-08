import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Category, Compare, Countries, Country, JobFilters, JobsPage, MapData, Overview, Salaries } from './models';

export interface Scope { country: string; what: string; where: string; }

/** Drops empty values so URLs (and the server cache keys) stay clean. */
function params(o: Record<string, string | number | string[] | null | undefined>) {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(o)) {
    if (Array.isArray(v)) v.forEach(x => (p = p.append(k, x)));
    else if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  }
  return p;
}

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  private b = environment.apiUrl;

  countries() { return this.http.get<Country[]>(`${this.b}/countries`); }
  categories(country: string) { return this.http.get<Category[]>(`${this.b}/categories`, { params: params({ country }) }); }
  overview(s: Scope) { return this.http.get<Overview>(`${this.b}/overview`, { params: params({ ...s }) }); }
  jobs(s: Scope, f: JobFilters) { return this.http.get<JobsPage>(`${this.b}/jobs`, { params: params({ ...s, ...f, pageSize: 20 }) }); }
  compare(country: string, where: string, q: string[]) { return this.http.get<Compare>(`${this.b}/compare`, { params: params({ country, where, q }) }); }
  salaries(s: Scope) { return this.http.get<Salaries>(`${this.b}/salaries`, { params: params({ ...s }) }); }
  compareCountries(what: string, codes: string[]) { return this.http.get<Countries>(`${this.b}/countries/compare`, { params: params({ what, codes: codes.join(',') }) }); }
  map(s: Scope) { return this.http.get<MapData>(`${this.b}/map`, { params: params({ ...s }) }); }
}
