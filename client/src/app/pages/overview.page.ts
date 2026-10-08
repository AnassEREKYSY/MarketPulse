import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api.service';
import { compactCount, count, errorText, money, pct } from '../core/format';
import { MarketState } from '../core/market-state';
import { Share } from '../core/models';
import { BarItem, BarListComponent } from '../shared/bar-list.component';
import { HistogramComponent } from '../shared/histogram.component';
import { IconComponent } from '../shared/icon.component';
import { JobCardComponent } from '../shared/job-card.component';
import { PanelComponent, StatComponent, StateComponent } from '../shared/ui';

@Component({
  selector: 'app-overview',
  imports: [RouterLink, BarListComponent, HistogramComponent, IconComponent, JobCardComponent, PanelComponent, StatComponent, StateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page py-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-2xs font-medium uppercase tracking-[0.1em] text-accent">Market overview</p>
          <h1 class="h1 mt-1">{{ title() }}</h1>
        </div>
        <p class="hint">Live ads from Adzuna · cached for a few hours</p>
      </div>

      @if (data.error()) {
        <app-state class="mt-6" tone="error" icon="ban" title="Could not load this market" [text]="err()" action="Try again" (act)="data.reload()" />
      } @else {
        @let d = data.value();
        <div class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="kpis">
          <app-stat label="Open jobs" [value]="d ? count(d.totalJobs) : '–'" [note]="d ? 'matching ads right now' : null" [loading]="data.isLoading()" />
          <app-stat label="New this week" [value]="d ? count(d.newThisWeek) : '–'" [note]="d && d.totalJobs ? pct(d.newThisWeek / d.totalJobs * 100) + ' of open jobs' : null" [loading]="data.isLoading()" />
          <app-stat label="Median salary" [value]="d ? money(d.salary.median, d.currency) : '–'" [note]="d && d.salary.p25 ? money(d.salary.p25, d.currency) + ' – ' + money(d.salary.p75, d.currency) + ' middle 50%' : null" [loading]="data.isLoading()" />
          <app-stat label="Remote" [value]="d ? pct(d.remotePercent) : '–'" [note]="d ? pct(d.hybridPercent) + ' hybrid · of ' + d.sampleSize + ' top ads' : null" [loading]="data.isLoading()" />
        </div>

        @if (d && d.totalJobs === 0) {
          <app-state class="mt-6" icon="search" title="No ads match this search" text="Try a broader skill, remove the location, or switch country." />
        } @else {
          <div class="mt-3 grid gap-3 xl:grid-cols-3">
            <app-panel class="xl:col-span-2" title="Salary distribution" [hint]="d ? 'Yearly salaries of all ' + compact(d.totalJobs) + ' ads, ' + d.currency : null">
              <button actions type="button" class="btn-ghost h-7 px-2 text-2xs" (click)="table.set(!table())" [attr.aria-pressed]="table()">{{ table() ? 'Chart' : 'Table' }}</button>
              @if (d) { <app-histogram [buckets]="d.histogram" [currency]="d.currency" [summary]="d.salary" [table]="table()" /> } @else { <div class="skeleton h-48"></div> }
            </app-panel>
            <app-panel title="Who's hiring" hint="Companies with the most ads">
              @if (d) { <app-bar-list [items]="companies()" labelWidth="9rem" /> } @else { <div class="skeleton h-48"></div> }
            </app-panel>
          </div>

          <div class="mt-3 grid items-start gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <app-panel title="Where" hint="Ads per region">
              @if (d) { <app-bar-list [items]="regions()" labelWidth="9rem" /> } @else { <div class="skeleton h-48"></div> }
            </app-panel>
            <app-panel title="Job types" [hint]="d ? 'From the ' + d.sampleSize + ' most relevant ads' : null">
              @if (d) {
                <div class="space-y-5">
                  <div><p class="label">Contract</p><app-bar-list [items]="shares(d.contracts)" labelWidth="6.5rem" [max]="100" /></div>
                  <div><p class="label">Hours</p><app-bar-list [items]="shares(d.times)" labelWidth="6.5rem" [max]="100" /></div>
                  <div><p class="label">Seniority in title</p><app-bar-list [items]="shares(d.seniority)" labelWidth="6.5rem" [max]="100" /></div>
                </div>
              } @else { <div class="skeleton h-48"></div> }
            </app-panel>
            <section class="panel lg:col-span-2 xl:col-span-1" aria-label="Latest ads">
              <header class="panel-head"><div><h2 class="h2">Latest ads</h2><p class="hint mt-0.5">Posted in the last 7 days</p></div>
                <a routerLink="/jobs" [queryParams]="jobsParams()" class="btn-ghost h-7 px-2 text-2xs">All jobs <app-icon name="arrow-right" [size]="12" /></a></header>
              @if (d) {
                @for (j of d.latest; track j.id) { <app-job-card [job]="j" [currency]="d.currency" [showSnippet]="false" /> }
                @empty { <p class="p-4 text-[13px] text-ink-faint">No new ads this week.</p> }
              } @else { <div class="space-y-2 p-4">@for (i of [1,2,3,4]; track i) { <div class="skeleton h-14"></div> }</div> }
            </section>
          </div>
          @if (d) { <p class="hint mt-4">{{ pct(d.salaryAdvertisedPercent) }} of the top {{ d.sampleSize }} ads state a salary; Adzuna estimates the rest. Remote, seniority and job types are read from the ad text.</p> }
        }
      }
    </div>
  `,
})
export class OverviewPage {
  private api = inject(Api);
  state = inject(MarketState);
  table = signal(false);
  data = rxResource({ request: () => this.state.scope(), loader: ({ request }) => this.api.overview(request) });
  count = count; pct = pct; money = money; compact = compactCount;

  title = computed(() => {
    const s = this.state.scope(); const c = this.state.country()?.name ?? s.country.toUpperCase();
    return `${s.what || 'All jobs'} · ${s.where ? s.where + ', ' : ''}${c}`;
  });
  err = computed(() => errorText(this.data.error()));
  companies = computed<BarItem[]>(() => {
    const d = this.data.value(); if (!d) return [];
    return d.companies.map(c => ({ label: c.name, value: c.count, display: count(c.count), sub: c.averageSalary ? money(c.averageSalary, d.currency) : undefined }));
  });
  regions = computed<BarItem[]>(() => (this.data.value()?.regions ?? []).map(r => ({ label: r.name, value: r.count, display: count(r.count) })));
  jobsParams = computed(() => ({ ...this.state.params(), sort: 'date' }));
  shares(s: Share[]): BarItem[] { return s.map(x => ({ label: x.name, value: x.percent, display: pct(x.percent) })); }
}
