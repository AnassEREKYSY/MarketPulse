import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { Api } from '../core/api.service';
import { count, errorText, money, pct } from '../core/format';
import { MarketState } from '../core/market-state';
import { BarItem, BarListComponent } from '../shared/bar-list.component';
import { PanelComponent, StateComponent } from '../shared/ui';

const DEFAULT = ['fr', 'gb', 'de', 'nl', 'us', 'ca'];

@Component({
  selector: 'app-countries',
  imports: [BarListComponent, PanelComponent, StateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page py-6">
      <p class="text-2xs font-medium uppercase tracking-[0.1em] text-accent">Countries</p>
      <h1 class="h1 mt-1">Where is {{ state.scope().what || 'the market' }} strongest?</h1>
      <p class="mt-1 text-[13px] text-ink-muted">Pick 2 to 6 of the 19 markets Adzuna covers. Salaries are converted to euros to compare them.</p>

      <div class="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Countries to compare">
        @for (c of state.countries(); track c.code) {
          <button type="button" class="chip" [class.chip-on]="selected().includes(c.code)" [attr.aria-pressed]="selected().includes(c.code)"
                  [disabled]="!selected().includes(c.code) && selected().length >= 6" (click)="toggle(c.code)" [attr.data-testid]="'country-' + c.code">
            <span class="num text-2xs text-ink-faint">{{ c.code.toUpperCase() }}</span> {{ c.name }}</button>
        }
      </div>

      @if (selected().length < 2) {
        <app-state class="mt-4" icon="globe" title="Pick at least two countries" />
      } @else if (data.error()) {
        <app-state class="mt-4" tone="error" icon="ban" title="Could not compare these countries" [text]="err()" action="Try again" (act)="data.reload()" />
      } @else {
        @let d = data.value();
        <section class="panel mt-4 overflow-x-auto" aria-label="Countries table">
          <table class="w-full min-w-[760px] text-[13px]" data-testid="countries-table">
            <thead><tr class="text-left text-2xs uppercase tracking-wider text-ink-faint">
              <th class="px-4 py-2.5 font-medium">Country</th><th class="px-4 py-2.5 text-right font-medium">Open jobs</th><th class="px-4 py-2.5 text-right font-medium">Median (local)</th>
              <th class="px-4 py-2.5 text-right font-medium">Median in €</th><th class="px-4 py-2.5 text-right font-medium">Average in €</th><th class="px-4 py-2.5 text-right font-medium">Remote</th><th class="px-4 py-2.5 font-medium">Busiest region</th></tr></thead>
            <tbody>
              @if (!d) { @for (s of selected(); track s) { <tr class="border-t border-line/[0.06]"><td colspan="7" class="px-4 py-3"><div class="skeleton h-5"></div></td></tr> } }
              @else {
                @for (c of sorted(); track c.code) {
                  <tr class="border-t border-line/[0.06] hover:bg-raised/50">
                    <td class="px-4 py-3"><span class="num mr-2 text-2xs text-ink-faint">{{ c.code.toUpperCase() }}</span>{{ c.name }}</td>
                    <td class="num px-4 py-3 text-right">{{ count(c.totalJobs) }}</td>
                    <td class="num px-4 py-3 text-right text-ink-muted">{{ money(c.medianSalary, c.currency) }}</td>
                    <td class="num px-4 py-3 text-right">{{ money(c.medianSalaryEur, 'EUR') }}</td>
                    <td class="num px-4 py-3 text-right text-ink-muted">{{ money(c.meanSalaryEur, 'EUR') }}</td>
                    <td class="num px-4 py-3 text-right">{{ pct(c.remotePercent) }}</td>
                    <td class="px-4 py-3 text-ink-muted">{{ c.topRegion ?? '–' }}</td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </section>
        @if (d) {
          <div class="mt-3 grid gap-3 lg:grid-cols-2">
            <app-panel title="Open jobs"><app-bar-list [items]="jobsBars()" labelWidth="9rem" /></app-panel>
            <app-panel title="Median salary in euros" hint="Median of the 50 most relevant ads"><app-bar-list [items]="salaryBars()" labelWidth="9rem" /></app-panel>
          </div>
          <p class="hint mt-4">Indicative exchange rates ({{ d.ratesAsOf }}). Salary levels do not account for cost of living or taxes.</p>
        }
      }
    </div>
  `,
})
export class CountriesPage {
  private api = inject(Api);
  private router = inject(Router);
  state = inject(MarketState);
  count = count; money = money; pct = pct;
  private q = toSignal(inject(ActivatedRoute).queryParamMap);
  selected = computed(() => {
    const raw = this.q()?.get('countries');
    const list = raw === null || raw === undefined ? [this.state.scope().country, ...DEFAULT] : raw.split(',');
    return [...new Set(list.map(x => x.trim().toLowerCase()).filter(Boolean))].slice(0, 6);
  });
  data = rxResource({
    request: () => ({ what: this.state.scope().what, codes: this.selected() }),
    loader: ({ request }) => (request.codes.length >= 2 ? this.api.compareCountries(request.what, request.codes) : of(undefined)),
  });
  err = computed(() => errorText(this.data.error()));
  sorted = computed(() => [...(this.data.value()?.items ?? [])].sort((a, b) => b.totalJobs - a.totalJobs));
  jobsBars = computed<BarItem[]>(() => this.sorted().map(c => ({ label: c.name, value: c.totalJobs, display: count(c.totalJobs) })));
  salaryBars = computed<BarItem[]>(() => [...this.sorted()].sort((a, b) => (b.medianSalaryEur ?? 0) - (a.medianSalaryEur ?? 0))
    .map(c => ({ label: c.name, value: c.medianSalaryEur ?? 0, display: money(c.medianSalaryEur, 'EUR') })));

  toggle(code: string) {
    const s = this.selected();
    const next = s.includes(code) ? s.filter(x => x !== code) : [...s, code];
    this.router.navigate([], { queryParams: { countries: next.join(',') }, queryParamsHandling: 'merge' });
  }
}
