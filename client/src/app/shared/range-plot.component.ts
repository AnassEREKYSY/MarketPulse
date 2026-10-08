import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { SalarySummary } from '../core/models';

export interface RangeRow { label: string; s: SalarySummary; note?: string; }

/** Salary ranges on one shared scale: thin line = 10th–90th percentile, bar = middle 50%, tick = median. */
@Component({
  selector: 'app-range-plot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="space-y-3.5">
      @for (r of rows(); track r.label; let i = $index) {
        <div class="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-[13px]" (mouseenter)="hover.set(i)" (mouseleave)="hover.set(null)">
          <span class="truncate" [class.text-ink]="hover() === i" [class.text-ink-muted]="hover() !== i">{{ r.label }}</span>
          <div class="relative h-6" role="img" [attr.aria-label]="r.label + ': ' + describe(r.s)">
            @if (r.s.median) {
              <div class="absolute top-1/2 h-px -translate-y-1/2 bg-line/40" [style.left.%]="x(r.s.p10 ?? r.s.p25 ?? r.s.median)" [style.width.%]="x(r.s.p90 ?? r.s.p75 ?? r.s.median) - x(r.s.p10 ?? r.s.p25 ?? r.s.median)"></div>
              <div class="absolute top-1/2 h-3 -translate-y-1/2 rounded-[4px] transition-colors" [class]="hover() === i ? 'bg-accent-hover' : 'bg-accent/80'" [style.left.%]="x(r.s.p25 ?? r.s.median)" [style.width.%]="Math.max(0.8, x(r.s.p75 ?? r.s.median) - x(r.s.p25 ?? r.s.median))"></div>
              <div class="absolute top-1/2 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-2 ring-surface" [style.left.%]="x(r.s.median)"></div>
            } @else { <span class="absolute inset-y-0 left-0 flex items-center text-[12px] text-ink-faint">No salary data</span> }
            @if (hover() === i && r.s.median) {
              <div class="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md border border-line/[0.12] bg-raised px-2.5 py-1.5 text-[12px] shadow-xl" [style.left.%]="Math.min(70, x(r.s.median))">
                <p class="num">p10 {{ format()(r.s.p10) }} · p25 {{ format()(r.s.p25) }}</p><p class="num text-ink">median {{ format()(r.s.median) }}</p><p class="num">p75 {{ format()(r.s.p75) }} · p90 {{ format()(r.s.p90) }}</p>
              </div>
            }
          </div>
          <span class="num min-w-[4.5rem] text-right text-ink">{{ format()(r.s.median) }}</span>
        </div>
      }
    </div>
    <div class="mt-3 grid grid-cols-[minmax(0,8rem)_1fr_auto] gap-3"><span></span>
      <div class="num relative h-4 text-2xs text-ink-faint" aria-hidden="true">@for (t of ticks(); track t) { <span class="absolute -translate-x-1/2" [style.left.%]="x(t)">{{ format()(t) }}</span> }</div>
      <span class="min-w-[4.5rem]"></span>
    </div>
    <p class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-ink-faint">
      <span class="inline-flex items-center gap-1.5"><span class="h-px w-4 bg-line/40"></span>10th–90th percentile</span>
      <span class="inline-flex items-center gap-1.5"><span class="h-2 w-4 rounded-sm bg-accent/80"></span>middle 50%</span>
      <span class="inline-flex items-center gap-1.5"><span class="h-3 w-[3px] rounded-full bg-ink"></span>median</span>
    </p>
  `,
})
export class RangePlotComponent {
  rows = input.required<RangeRow[]>();
  format = input<(v: number | null) => string>(v => String(v ?? '–'));
  hover = signal<number | null>(null);
  Math = Math;

  private scale = computed(() => {
    const v = this.rows().flatMap(r => [r.s.p10, r.s.p25, r.s.median, r.s.p75, r.s.p90]).filter((x): x is number => x !== null && x > 0);
    if (!v.length) return { lo: 0, hi: 1 };
    const lo = Math.min(...v), hi = Math.max(...v), pad = (hi - lo) * 0.06 || hi * 0.1;
    return { lo: Math.max(0, lo - pad), hi: hi + pad };
  });
  ticks = computed(() => {
    const { lo, hi } = this.scale(); const raw = (hi - lo) / 4; const mag = 10 ** Math.floor(Math.log10(raw || 1));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? raw;
    const out: number[] = []; for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) out.push(t); return out;
  });
  x(v: number | null) { const { lo, hi } = this.scale(); return v === null ? 0 : ((v - lo) / (hi - lo)) * 100; }
  describe(s: SalarySummary) { const f = this.format(); return `median ${f(s.median)}, middle 50% ${f(s.p25)} to ${f(s.p75)}`; }
}
