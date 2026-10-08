import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { count, money } from '../core/format';
import { Bucket, SalarySummary } from '../core/models';

/** Salary distribution: one bar per Adzuna bucket, with the median and middle 50% marked. */
@Component({
  selector: 'app-histogram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (!total()) {
      <p class="py-10 text-center text-[13px] text-ink-faint">No salary data for this search.</p>
    } @else if (table()) {
      <table class="w-full text-[13px]">
        <thead><tr class="text-left text-2xs uppercase tracking-wider text-ink-faint"><th class="pb-2 font-medium">Salary</th><th class="pb-2 text-right font-medium">Ads</th><th class="pb-2 text-right font-medium">Share</th></tr></thead>
        <tbody>@for (b of buckets(); track b.from) {
          <tr class="border-t border-line/[0.06]"><td class="py-1.5 num text-ink-muted">{{ range(b) }}</td><td class="py-1.5 text-right num">{{ fmtCount(b.count) }}</td><td class="py-1.5 text-right num text-ink-muted">{{ share(b.count) }}%</td></tr>
        }</tbody>
      </table>
    } @else {
      <div class="relative">
        <div class="flex h-52 items-end gap-[2px]" role="img" [attr.aria-label]="label()">
          @for (b of buckets(); track b.from; let i = $index) {
            <div class="group relative flex h-full flex-1 items-end" (mouseenter)="hover.set(i)" (mouseleave)="hover.set(null)">
              <div class="w-full rounded-t-[4px] transition-colors" [class]="inMiddle(b) ? 'bg-accent' : 'bg-accent/35'" [class.!bg-accent-hover]="hover() === i" [style.height.%]="b.count ? Math.max(1.5, b.count / max() * 100) : 0"></div>
              @if (hover() === i) {
                <div class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line/[0.12] bg-raised px-2.5 py-1.5 text-[12px] shadow-xl">
                  <p class="num text-ink">{{ range(b) }}</p><p class="num text-ink-muted">{{ fmtCount(b.count) }} ads · {{ share(b.count) }}%</p>
                </div>
              }
            </div>
          }
        </div>
        @if (summary()?.median; as m) {
          <div class="pointer-events-none absolute inset-y-0 border-l border-dashed border-ink/70" [style.left.%]="pos(m)">
            <span class="num absolute -top-1 left-1.5 whitespace-nowrap rounded bg-bg/80 px-1 text-2xs text-ink">median {{ fmt(m) }}</span>
          </div>
        }
      </div>
      <div class="mt-2 flex gap-[2px] text-2xs text-ink-faint">
        @for (b of buckets(); track b.from; let i = $index) { <span class="num flex-1 truncate text-center">{{ i % step() === 0 ? fmt(b.from) : '' }}</span> }
      </div>
      <p class="mt-3 flex items-center gap-2 text-2xs text-ink-faint"><span class="inline-block h-2 w-3 rounded-sm bg-accent"></span> middle 50% of ads <span class="ml-2 inline-block h-2 w-3 rounded-sm bg-accent/35"></span> others</p>
    }
  `,
})
export class HistogramComponent {
  buckets = input.required<Bucket[]>();
  currency = input('EUR');
  summary = input<SalarySummary | null>(null);
  table = input(false);
  hover = signal<number | null>(null);
  Math = Math;
  total = computed(() => this.buckets().reduce((s, b) => s + b.count, 0));
  max = computed(() => Math.max(1, ...this.buckets().map(b => b.count)));
  step = computed(() => Math.ceil(this.buckets().length / 7));
  label = computed(() => 'Salary distribution: ' + this.buckets().map(b => `${this.range(b)} ${b.count} ads`).join(', '));

  fmt(v: number) { return money(v, this.currency()); }
  fmtCount = count;
  range(b: Bucket) { return b.to ? `${this.fmt(b.from)} – ${this.fmt(b.to)}` : `${this.fmt(b.from)}+`; }
  share(n: number) { return Math.round((n / this.total()) * 1000) / 10; }
  inMiddle(b: Bucket) { const s = this.summary(); if (!s?.p25 || !s?.p75) return true; return (b.to ?? Infinity) > s.p25 && b.from < s.p75; }
  /** Horizontal position (%) of a salary on the bucket axis. */
  pos(v: number) {
    const bs = this.buckets(); const n = bs.length;
    for (let i = 0; i < n; i++) {
      const b = bs[i]; const to = b.to ?? b.from + (n > 1 ? b.from - bs[n - 2].from : b.from * 0.25);
      if (v < to || i === n - 1) return ((i + Math.min(1, Math.max(0, (v - b.from) / (to - b.from)))) / n) * 100;
    }
    return 0;
  }
}
