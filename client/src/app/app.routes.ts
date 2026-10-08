import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', title: 'MarketPulse · Job market overview', loadComponent: () => import('./pages/overview.page').then(m => m.OverviewPage) },
      { path: 'jobs', title: 'Jobs · MarketPulse', loadComponent: () => import('./pages/jobs.page').then(m => m.JobsPage) },
      { path: 'compare', title: 'Compare skills · MarketPulse', loadComponent: () => import('./pages/compare.page').then(m => m.ComparePage) },
      { path: 'salaries', title: 'Salary explorer · MarketPulse', loadComponent: () => import('./pages/salaries.page').then(m => m.SalariesPage) },
      { path: 'countries', title: 'Countries · MarketPulse', loadComponent: () => import('./pages/countries.page').then(m => m.CountriesPage) },
      { path: 'map', title: 'Map · MarketPulse', loadComponent: () => import('./pages/map.page').then(m => m.MapPage) },
      // Old URLs
      { path: 'dashboard', redirectTo: '' },
      { path: 'search', redirectTo: 'jobs' },
      { path: 'analytics', redirectTo: 'salaries' },
      { path: 'maps', redirectTo: 'map' },
      { path: '**', title: 'Not found · MarketPulse', loadComponent: () => import('./pages/not-found.page').then(m => m.NotFoundPage) },
    ],
  },
];
