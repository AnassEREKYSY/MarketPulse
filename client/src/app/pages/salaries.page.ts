import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Api } from '../core/api.service';
import { count, errorText, money } from '../core/format';
import { MarketState } from '../core/market-state';
import { SalaryGroup } from '../core/models';
import { BarItem, BarListComponent } from '../shared/bar-list.component';
import { HistogramComponent } from '../shared/histogram.component';
import { LineChartComponent, LinePoint } from '../shared/line-chart.component';
import { PanelComponent, StatComponent, StateComponent } from '../shared/ui';

@Component({
  selector: 'app-salaries',
  imports: [BarListComponent, HistogramComponent, LineChartComponent, PanelComponent, StatComponent, StateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page py-6">
      <p class="text-2xs font-medium uppercase tracking-[0.1em] text-accent">Salary explorer</p>
      <h1 class="h1 mt-1">What does {{ state.scope().what || 'a job' }} pay<span class="text-ink-faint"> in {{ place() }}</span>?</h1>

      @if (data.error()) {
        <app-state class="mt-6" tone="error" icon="ban" title="Could not load salaries" [text]="err()" action="Try again" (act)="data.reload()" />
      } @else {
        @let d = data.value();
        <div class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="percentiles">
          <app-stat label="Entry (25th pct.)" [value]="d ? money(d.summary.p25, d.currency) : '–'" [note]="d ? 'a quarter of ads pay less' : null" [loading]="data.isLoading()" />
          <app-stat label="Median" [value]="d ? money(d.summary.median, d.currency) : '–'" [note]="d && d.summary.mean ? 'average ' + money(d.summary.mean, d.currency) : null" [loading]="data.isLoading()" />
          <app-stat label="Experienced (75th)" [value]="d ? money(d.summary.p75, d.currency) : '–'" [note]="d ? 'a quarter of ads pay more' : null" [loading]="data.isLoading()" />
          <app-stat label="Top 10%" [value]="d ? money(d.summary.p90, d.currency) : '–'" [note]="d ? 'from this amount and up' : null" [loading]="data.isLoading()" />
        </div>

        <div class="mt-3 grid gap-3 xl:grid-cols-2">
          <app-panel title="Distribution" [hint]="d ? 'Yearly salary of every matching ad, ' + d.currency : null">
            <button actions type="button" class="btn-ghost h-7 px-2 text-2xs" (click)="table.set(!table())" [attr.aria-pressed]="table()">{{ table() ? 'Chart' : 'Table' }}</button>
            @if (d) { <app-histogram [buckets]="d.histogram" [currency]="d.currency" [summary]="d.summary" [table]="table()" /> } @else { <div class="skeleton h-52"></div> }
          </app-panel>
          <app-panel title="Last 12 months" [hint]="d?.categoryLabel ? 'Average advertised salary in ' + d!.categoryLabel : 'Average advertised salary'">
            <button actions type="button" class="btn-ghost h-7 px-2 text-2xs" (click)="historyTable.set(!historyTable())" [attr.aria-pressed]="historyTable()">{{ historyTable() ? 'Chart' : 'Table' }}</button>
            @if (!d) { <div class="skeleton h-52"></div> }
            @else if (historyTable()) {
              <table class="w-full text-[13px]"><tbody>@for (p of history(); track p.label) { <tr class="border-t border-line/[0.06] first:border-0"><td class="py-1.5 text-ink-muted">{{ p.label }}</td><td class="num py-1.5 text-right">{{ money(p.value, d.currency, true) }}</td></tr> }</tbody></table>
            } @else {
              <app-line-chart [points]="history()" [format]="fmt" />
              @if (change(); as c) { <p class="mt-3 text-[13px] text-ink-muted">Over the year: <span class="num" [class]="c >= 0 ? 'text-up' : 'text-down'">{{ c >= 0 ? '▲' : '▼' }} {{ c >= 0 ? '+' : '' }}{{ c }}%</span></p> }
            }
          </app-panel>
        </div>

        <div class="mt-3 grid gap-3 lg:grid-cols-3">
          <app-panel title="By seniority" hint="Median, from the level written in the ad">
            @if (d) { <app-bar-list [items]="groups(d.bySeniority)" labelWidth="6rem" empty="Not enough ads with a level and a salary." /> } @else { <div class="skeleton h-40"></div> }
          </app-panel>
          <app-panel title="By region" hint="Median of ads in each region (3+ ads)">
            @if (d) { <app-bar-list [items]="groups(d.byRegion)" labelWidth="9rem" empty="Not enough ads per region." /> } @else { <div class="skeleton h-40"></div> }
          </app-panel>
          <app-panel title="Best-paying recruiters" hint="Average advertised salary, companies with 2+ ads">
            @if (d) { <app-bar-list [items]="companies()" labelWidth="9rem" empty="No company data for this search." /> } @else { <div class="skeleton h-40"></div> }
          </app-panel>
        </div>
        @if (d) { <p class="hint mt-4">Percentiles and the distribution use all {{ d.what ? '"' + d.what + '"' : '' }} ads; seniority and regions use the {{ count(d.sampleWithSalary) }} most relevant ads with a salary (some are Adzuna estimates).</p> }
      }
    </div>
  `,
})
export class SalariesPage {
  private api = inject(Api);
  state = inject(MarketState);
  table = signal(false);
  historyTable = signal(false);
  money = money; count = count;
  data = rxResource({ request: () => this.state.scope(), loader: ({ request }) => this.api.salaries(request) });
  err = computed(() => errorText(this.data.error()));
  place = computed(() => { const s = this.state.scope(); return `${s.where ? s.where + ', ' : ''}${this.state.country()?.name ?? s.country.toUpperCase()}`; });
  history = computed<LinePoint[]>(() => (this.data.value()?.history ?? []).map(h => ({ label: new Date(h.month + '-01T00:00:00').toLocaleDateString('en', { month: 'short', year: '2-digit' }), value: h.value })));
  change = computed(() => { const h = this.history(); if (h.length < 2 || !h[0].value) return null; return Math.round(((h[h.length - 1].value - h[0].value) / h[0].value) * 1000) / 10; });
  companies = computed<BarItem[]>(() => { const d = this.data.value(); if (!d) return []; return d.topPayingCompanies.map(c => ({ label: c.name, value: c.averageSalary ?? 0, display: money(c.averageSalary, d.currency), sub: `${c.count} ads` })); });
  fmt = (v: number) => money(v, this.data.value()?.currency ?? 'EUR');
  groups(g: SalaryGroup[]): BarItem[] { const c = this.data.value()?.currency ?? 'EUR'; return g.map(x => ({ label: x.name, value: x.median, display: money(x.median, c), sub: `${x.jobs} ads` })); }
}
