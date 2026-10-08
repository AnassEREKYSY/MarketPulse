import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AgoPipe, salaryRange } from '../core/format';
import { Job } from '../core/models';
import { IconComponent } from './icon.component';

const SENIORITY: Record<string, string> = { Junior: 'Junior', Mid: 'Mid-level', Senior: 'Senior', Lead: 'Lead' };

@Component({
  selector: 'app-job-card',
  imports: [AgoPipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @let j = job();
    <article class="group flex gap-4 border-b border-line/[0.06] px-4 py-3.5 transition-colors last:border-0 hover:bg-raised/60">
      <div class="min-w-0 flex-1">
        <h3 class="text-[14px] font-medium leading-snug">
          <a [href]="j.url" target="_blank" rel="noopener noreferrer" class="hover:text-accent-hover focus-visible:text-accent-hover">{{ j.title }}<span class="sr-only"> (opens the ad on Adzuna)</span></a>
        </h3>
        <p class="mt-0.5 truncate text-[13px] text-ink-muted">{{ j.company }}@if (j.location) { <span class="text-ink-faint"> · {{ j.location }}</span> }</p>
        @if (showSnippet() && j.snippet) { <p class="mt-1.5 line-clamp-2 text-[13px] text-ink-faint">{{ j.snippet }}</p> }
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          @if (j.workMode !== 'Onsite') { <span class="tag !text-accent !ring-accent/40">{{ j.workMode }}</span> }
          @if (seniority()) { <span class="tag">{{ seniority() }}</span> }
          @if (j.contract !== 'Unspecified') { <span class="tag">{{ j.contract }}</span> }
          @if (j.time === 'PartTime') { <span class="tag">Part time</span> }
          <span class="text-2xs text-ink-faint">{{ j.created | ago }}</span>
        </div>
      </div>
      <div class="shrink-0 text-right">
        @if (salary()) {
          <p class="num text-[13px] text-ink">{{ salary() }}</p>
          <p class="text-2xs text-ink-faint">{{ j.salaryIsEstimate ? 'estimate' : 'per year' }}</p>
        } @else { <p class="text-2xs text-ink-faint">No salary</p> }
        <a [href]="j.url" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex items-center gap-1 text-2xs text-ink-faint opacity-0 transition group-hover:opacity-100 hover:text-accent focus-visible:opacity-100" tabindex="-1" aria-hidden="true">Open <app-icon name="external" [size]="11" /></a>
      </div>
    </article>
  `,
})
export class JobCardComponent {
  job = input.required<Job>();
  currency = input('EUR');
  showSnippet = input(true);
  seniority = computed(() => SENIORITY[this.job().seniority] ?? null);
  salary = computed(() => salaryRange(this.job().salaryMin, this.job().salaryMax, this.currency()));
}
