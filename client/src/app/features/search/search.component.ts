import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobsService } from '../../core/services/jobs.service';
import { JobOffer, SearchJobMarketResult } from '../../core/models/job-offer.model';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatIconModule,
    MatPaginatorModule
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent implements OnInit {
  private jobsService = inject(JobsService);
  
  searchQuery: string = '';
  location: string = '';
  employmentType: string = '';
  workMode: string = '';
  experienceLevel: string = '';
  minSalary: number | null = null;
  maxSalary: number | null = null;
  
  results: SearchJobMarketResult | null = null;
  loading = false;
  error: string | null = null;
  
  pageSize = 20;
  pageIndex = 0;

  employmentTypes = ['CDI', 'CDD', 'Freelance', 'Internship', 'Other'];
  workModes = ['Remote', 'Hybrid', 'Onsite', 'Flexible'];
  experienceLevels = ['Junior', 'Mid', 'Senior', 'Lead', 'Any'];

  ngOnInit() {
    this.search();
  }

  search() {
    this.loading = true;
    this.error = null;
    this.pageIndex = 0;

    this.jobsService.searchJobs({
      query: this.searchQuery || undefined,
      location: this.location || undefined,
      employmentType: this.employmentType || undefined,
      workMode: this.workMode || undefined,
      experienceLevel: this.experienceLevel || undefined,
      minSalary: this.minSalary || undefined,
      maxSalary: this.maxSalary || undefined,
      page: this.pageIndex + 1,
      pageSize: this.pageSize
    }).subscribe({
      next: (result) => {
        this.results = result;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to search jobs';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.search();
  }

  clearFilters() {
    this.searchQuery = '';
    this.location = '';
    this.employmentType = '';
    this.workMode = '';
    this.experienceLevel = '';
    this.minSalary = null;
    this.maxSalary = null;
    this.search();
  }
}

