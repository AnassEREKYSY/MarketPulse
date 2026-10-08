import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { Api } from '../core/api.service';
import { count, errorText } from '../core/format';
import { MarketState } from '../core/market-state';
import { JobFilters } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { JobCardComponent } from '../shared/job-card.component';
import { StateComponent } from '../shared/ui';

const KEYS: (keyof JobFilters)[] = ['sort', 'maxDaysOld', 'contract', 'time', 'workMode', 'salaryMin', 'category'];

@Component({
  selector: 'app-jobs',
  imports: [FormsModule, IconComponent, JobCardComponent, StateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page py-6">
      <p class="text-2xs font-medium uppercase tracking-[0.1em] text-accent">Jobs</p>
      <h1 class="h1 mt-1">{{ state.scope().what || 'All jobs' }}<span class="text-ink-faint"> · {{ place() }}</span></h1>

      <!-- Filters: one row above the results (folded behind a button on phones) -->
      <button type="button" class="btn-secondary mt-4 sm:hidden" (click)="open.set(!open())" [attr.aria-expanded]="open()" aria-controls="filters">
        <app-icon name="sliders" [size]="14" /> Filters @if (activeCount()) { <span class="num rounded bg-accent/20 px-1.5 text-2xs text-ink">{{ activeCount() }}</span> }</button>
      <div id="filters" class="mt-3 grid-cols-2 gap-2 sm:mt-5 sm:grid sm:grid-cols-4 xl:grid-cols-7" [class.grid]="open()" [class.hidden]="!open()" role="group" aria-label="Filters">
        <label class="block"><span class="label">Sort</span>
          <select class="select" [ngModel]="f().sort" (ngModelChange)="set('sort', $event)" data-testid="f-sort"><option value="">Most relevant</option><option value="date">Newest</option><option value="salary">Highest salary</option></select></label>
        <label class="block"><span class="label">Posted</span>
          <select class="select" [ngModel]="f().maxDaysOld" (ngModelChange)="set('maxDaysOld', $event)"><option value="">Any time</option><option value="1">Last 24 hours</option><option value="3">Last 3 days</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label>
        <label class="block"><span class="label">Work mode</span>
          <select class="select" [ngModel]="f().workMode" (ngModelChange)="set('workMode', $event)" data-testid="f-mode"><option value="">Any</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option></select></label>
        <label class="block"><span class="label">Contract</span>
          <select class="select" [ngModel]="f().contract" (ngModelChange)="set('contract', $event)"><option value="">Any</option><option value="permanent">Permanent</option><option value="contract">Contract</option></select></label>
        <label class="block"><span class="label">Hours</span>
          <select class="select" [ngModel]="f().time" (ngModelChange)="set('time', $event)"><option value="">Any</option><option value="fulltime">Full time</option><option value="parttime">Part time</option></select></label>
        <label class="block"><span class="label">Min salary / year</span>
          <select class="select" [ngModel]="f().salaryMin" (ngModelChange)="set('salaryMin', $event)">
            <option value="">Any</option>@for (s of salarySteps(); track s) { <option [value]="s">{{ s.toLocaleString('en') }}+</option> }</select></label>
        <label class="col-span-2 block sm:col-span-1"><span class="label">Category</span>
          <select class="select" [ngModel]="f().category" (ngModelChange)="set('category', $event)"><option value="">All categories</option>@for (c of categories.value() ?? []; track c.tag) { <option [value]="c.tag">{{ c.label }}</option> }</select></label>
      </div>
      @if (active()) { <button type="button" class="btn-ghost mt-2 h-7 px-2 text-2xs" (click)="clear()"><app-icon name="x" [size]="12" /> Clear filters</button> }

      @if (jobs.error()) {
        <app-state class="mt-5" tone="error" icon="ban" title="Could not load jobs" [text]="err()" action="Try again" (act)="jobs.reload()" />
      } @else {
        @let p = jobs.value();
        <div class="mt-4 flex flex-col gap-1 text-[13px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite">@if (p) { <span class="num text-ink">{{ count(p.total) }}</span> ads @if (p.pages > 1) { · page {{ p.page }} of {{ p.pages }} } } @else { Loading… }</p>
          @if (f().workMode) { <p class="hint">Remote and hybrid filters keep ads that mention it.</p> }
        </div>
        <section class="panel mt-2 overflow-hidden" aria-label="Results" data-testid="results">
          @if (!p) { <div class="space-y-px">@for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton h-24 rounded-none"></div> }</div> }
          @else {
            @for (j of p.jobs; track j.id) { <app-job-card [job]="j" [currency]="p.currency" /> }
            @empty { <app-state class="[&>div]:border-0" icon="search" title="No ads match these filters" text="Remove a filter or widen the search." /> }
          }
        </section>
        @if (p && p.pages > 1) {
          <nav class="mt-4 flex items-center justify-center gap-2" aria-label="Pages">
            <button type="button" class="btn-secondary" [disabled]="p.page <= 1" (click)="go(p.page - 1)"><app-icon name="chevron-left" [size]="15" /> Previous</button>
            <span class="num px-2 text-[13px] text-ink-muted">{{ p.page }} / {{ p.pages }}</span>
            <button type="button" class="btn-secondary" [disabled]="p.page >= p.pages" (click)="go(p.page + 1)" data-testid="next">Next <app-icon name="chevron-right" [size]="15" /></button>
          </nav>
        }
      }
    </div>
  `,
})
export class JobsPage {
  private api = inject(Api);
  private router = inject(Router);
  state = inject(MarketState);
  count = count;
  private q = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map(m => m)));
  f = computed<JobFilters>(() => {
    const m = this.q();
    return { page: Math.max(1, Number(m?.get('page')) || 1), ...Object.fromEntries(KEYS.map(k => [k, m?.get(k) ?? ''])) } as JobFilters;
  });
  active = computed(() => this.activeCount() > 0);
  activeCount = computed(() => KEYS.filter(k => k !== 'sort' && this.f()[k]).length);
  open = signal(false);
  jobs = rxResource({ request: () => ({ s: this.state.scope(), f: this.f() }), loader: ({ request }) => this.api.jobs(request.s, request.f) });
  categories = rxResource({ request: () => this.state.scope().country, loader: ({ request }) => this.api.categories(request) });
  err = computed(() => errorText(this.jobs.error()));
  place = computed(() => { const s = this.state.scope(); return `${s.where ? s.where + ', ' : ''}${this.state.country()?.name ?? s.country.toUpperCase()}`; });
  salarySteps = computed(() => {
    const cur = this.state.country()?.currency ?? 'EUR';
    const base = cur === 'INR' ? 500000 : cur === 'ZAR' || cur === 'MXN' || cur === 'BRL' || cur === 'PLN' ? 100000 : cur === 'USD' || cur === 'CAD' || cur === 'AUD' || cur === 'NZD' || cur === 'SGD' || cur === 'CHF' ? 40000 : 30000;
    return [1, 1.33, 1.66, 2, 2.66, 3.33].map(m => Math.round((base * m) / 5000) * 5000);
  });

  set(k: keyof JobFilters, v: string) { this.router.navigate([], { queryParams: { [k]: v || null, page: null }, queryParamsHandling: 'merge' }); }
  go(page: number) { this.router.navigate([], { queryParams: { page: page > 1 ? page : null }, queryParamsHandling: 'merge' }); window.scrollTo({ top: 0 }); }
  clear() { this.router.navigate([], { queryParams: Object.fromEntries([...KEYS.filter(k => k !== 'sort'), 'page'].map(k => [k, null])), queryParamsHandling: 'merge' }); }
}
