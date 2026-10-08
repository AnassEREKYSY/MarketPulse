import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { Api } from '../core/api.service';
import { count, errorText, money, pct } from '../core/format';
import { MarketState } from '../core/market-state';
import { BarItem, BarListComponent } from '../shared/bar-list.component';
import { IconComponent } from '../shared/icon.component';
import { RangePlotComponent, RangeRow } from '../shared/range-plot.component';
import { PanelComponent, StateComponent } from '../shared/ui';

const PRESETS = [['.NET', 'Java', 'Node.js', 'Python'], ['React', 'Angular', 'Vue'], ['Data engineer', 'Data scientist', 'Data analyst'], ['DevOps', 'SRE', 'Cloud engineer']];

@Component({
  selector: 'app-compare',
  imports: [FormsModule, BarListComponent, IconComponent, PanelComponent, RangePlotComponent, StateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page py-6">
      <p class="text-2xs font-medium uppercase tracking-[0.1em] text-accent">Compare skills</p>
      <h1 class="h1 mt-1">Which stack is in demand?</h1>
      <p class="mt-1 text-[13px] text-ink-muted">Put 2 to 4 skills or job titles side by side in {{ place() }}.</p>

      <div class="panel mt-5 p-4">
        <div class="flex flex-wrap items-center gap-2">
          @for (s of skills(); track s) {
            <span class="inline-flex h-8 items-center gap-1 rounded-md bg-raised pl-3 pr-1 text-[13px]">{{ s }}
              <button type="button" class="btn-icon h-6 w-6 text-ink-faint hover:text-ink" (click)="remove(s)" [attr.aria-label]="'Remove ' + s"><app-icon name="x" [size]="13" /></button></span>
          }
          @if (skills().length < 4) {
            <form class="flex items-center gap-1" (ngSubmit)="add()">
              <input class="input h-8 w-44" name="draft" [ngModel]="draft()" (ngModelChange)="draft.set($event)" placeholder="Add a skill…" aria-label="Add a skill" data-testid="add-skill" maxlength="60" />
              <button type="submit" class="btn-secondary h-8" [disabled]="!draft().trim()"><app-icon name="plus" [size]="14" /> Add</button>
            </form>
          }
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-1.5"><span class="hint mr-1">Try</span>
          @for (p of presets; track $index) { <button type="button" class="chip" (click)="setSkills(p)">{{ p.join(' · ') }}</button> }
        </div>
      </div>

      @if (skills().length < 2) {
        <app-state class="mt-4" icon="scale" title="Add at least two skills" text="For example .NET and Java, or React and Angular." />
      } @else if (data.error()) {
        <app-state class="mt-4" tone="error" icon="ban" title="Could not compare these skills" [text]="err()" action="Try again" (act)="data.reload()" />
      } @else {
        @let d = data.value();
        <section class="panel mt-4 overflow-x-auto" aria-label="Comparison table">
          <table class="w-full min-w-[720px] text-[13px]" data-testid="compare-table">
            <thead><tr class="border-b border-line/[0.06] text-left text-2xs uppercase tracking-wider text-ink-faint">
              <th class="px-4 py-2.5 font-medium">Skill</th><th class="px-4 py-2.5 text-right font-medium">Open jobs</th><th class="px-4 py-2.5 text-right font-medium">Median salary</th>
              <th class="px-4 py-2.5 text-right font-medium">Middle 50%</th><th class="px-4 py-2.5 text-right font-medium">Remote</th><th class="px-4 py-2.5 text-right font-medium">Hybrid</th><th class="px-4 py-2.5 font-medium">Top region</th><th class="px-4 py-2.5 font-medium">Top recruiter</th></tr></thead>
            <tbody>
              @if (!d) { @for (s of skills(); track s) { <tr class="border-t border-line/[0.06]"><td class="px-4 py-3" colspan="8"><div class="skeleton h-5"></div></td></tr> } }
              @else {
                @for (it of d.items; track it.query) {
                  <tr class="border-t border-line/[0.06] first:border-0 hover:bg-raised/50">
                    <td class="px-4 py-3 font-medium">{{ it.query }}@if (it.query === leader()) { <span class="tag ml-2 !text-accent !ring-accent/40">most jobs</span> }</td>
                    <td class="num px-4 py-3 text-right">{{ count(it.totalJobs) }}</td>
                    <td class="num px-4 py-3 text-right">{{ money(it.salary.median, d.currency) }}</td>
                    <td class="num px-4 py-3 text-right text-ink-muted">{{ it.salary.p25 ? money(it.salary.p25, d.currency) + ' – ' + money(it.salary.p75, d.currency) : '–' }}</td>
                    <td class="num px-4 py-3 text-right">{{ pct(it.remotePercent) }}</td>
                    <td class="num px-4 py-3 text-right text-ink-muted">{{ pct(it.hybridPercent) }}</td>
                    <td class="px-4 py-3 text-ink-muted">{{ it.topRegion ?? '–' }}</td>
                    <td class="px-4 py-3 text-ink-muted">{{ it.topCompany ?? '–' }}</td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </section>

        @if (d) {
          <div class="mt-3 grid gap-3 lg:grid-cols-2">
            <app-panel class="lg:col-span-2" title="Salary ranges" [hint]="'Yearly, ' + d.currency + ', from all ads of each skill'">
              <app-range-plot [rows]="ranges()" [format]="fmt" />
            </app-panel>
            <app-panel title="Open jobs"><app-bar-list [items]="jobsBars()" labelWidth="8rem" /></app-panel>
            <app-panel title="Remote and hybrid" hint="Share of the 50 most relevant ads">
              <app-bar-list [items]="remoteBars()" labelWidth="8rem" [max]="100" />
            </app-panel>
          </div>
        }
      }
    </div>
  `,
})
export class ComparePage {
  private api = inject(Api);
  private router = inject(Router);
  state = inject(MarketState);
  presets = PRESETS;
  draft = signal('');
  count = count; money = money; pct = pct;
  private q = toSignal(inject(ActivatedRoute).queryParamMap);
  skills = computed(() => {
    const raw = this.q()?.get('skills');
    if (raw === null || raw === undefined) return PRESETS[0];
    return raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);
  });
  data = rxResource({
    request: () => ({ c: this.state.scope().country, l: this.state.scope().where, s: this.skills() }),
    loader: ({ request }) => (request.s.length >= 2 ? this.api.compare(request.c, request.l, request.s) : of(undefined)),
  });
  err = computed(() => errorText(this.data.error()));
  place = computed(() => { const s = this.state.scope(); return `${s.where ? s.where + ', ' : ''}${this.state.country()?.name ?? s.country.toUpperCase()}`; });
  leader = computed(() => { const it = this.data.value()?.items ?? []; return it.length ? it.reduce((a, b) => (b.totalJobs > a.totalJobs ? b : a)).query : null; });
  ranges = computed<RangeRow[]>(() => (this.data.value()?.items ?? []).map(i => ({ label: i.query, s: i.salary })));
  jobsBars = computed<BarItem[]>(() => (this.data.value()?.items ?? []).map(i => ({ label: i.query, value: i.totalJobs, display: count(i.totalJobs) })));
  remoteBars = computed<BarItem[]>(() => (this.data.value()?.items ?? []).map(i => ({ label: i.query, value: i.remotePercent, display: pct(i.remotePercent), sub: '+' + pct(i.hybridPercent) + ' hybrid' })));
  fmt = (v: number | null) => money(v, this.data.value()?.currency ?? 'EUR');

  setSkills(list: string[]) { this.router.navigate([], { queryParams: { skills: list.join(',') }, queryParamsHandling: 'merge' }); }
  add() {
    const v = this.draft().trim().replace(/,/g, ' ');
    if (!v || this.skills().some(s => s.toLowerCase() === v.toLowerCase())) { this.draft.set(''); return; }
    this.setSkills([...this.skills(), v]); this.draft.set('');
  }
  remove(s: string) { this.setSkills(this.skills().filter(x => x !== s)); }
}
