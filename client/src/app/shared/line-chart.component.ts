import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface LinePoint { label: string; value: number; }

/** One series over time: 2px line, soft area, crosshair + tooltip on hover. Axis text is HTML so it never stretches. */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (points().length < 2) {
      <p class="py-10 text-center text-[13px] text-ink-faint">{{ empty() }}</p>
    } @else {
      <div class="grid grid-cols-[auto_1fr] gap-x-3">
        <div class="num flex h-44 flex-col justify-between text-right text-2xs text-ink-faint" aria-hidden="true"><span>{{ format()(hi()) }}</span><span>{{ format()(mid()) }}</span><span>{{ format()(lo()) }}</span></div>
        <div class="relative h-44" (mouseleave)="hover.set(null)" role="img" [attr.aria-label]="label()">
          <div class="absolute inset-x-0 top-0 border-t border-line/[0.06]"></div><div class="absolute inset-x-0 top-1/2 border-t border-line/[0.06]"></div><div class="absolute inset-x-0 bottom-0 border-t border-line/[0.1]"></div>
          <svg class="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="lc-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="rgb(var(--accent))" stop-opacity=".22"/><stop offset="1" stop-color="rgb(var(--accent))" stop-opacity="0"/></linearGradient></defs>
            <path [attr.d]="area()" fill="url(#lc-fill)"/>
            <path [attr.d]="line()" fill="none" stroke="rgb(var(--accent))" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>
          </svg>
          @if (hover() !== null) {
            @let p = points()[hover()!];
            <div class="pointer-events-none absolute inset-y-0 border-l border-line/30" [style.left.%]="x(hover()!)"></div>
            <div class="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-surface" [style.left.%]="x(hover()!)" [style.top.%]="y(p.value)"></div>
            <div class="pointer-events-none absolute z-10 -translate-y-full whitespace-nowrap rounded-md border border-line/[0.12] bg-raised px-2.5 py-1.5 text-[12px] shadow-xl"
                 [style.left.%]="x(hover()!)" [style.top.%]="y(p.value)" [style.transform]="'translate(' + (x(hover()!) > 70 ? '-105%' : '8px') + ', calc(-100% - 6px))'">
              <p class="text-ink-muted">{{ p.label }}</p><p class="num text-ink">{{ format()(p.value) }}</p>
            </div>
          }
          <div class="absolute inset-0 flex">
            @for (p of points(); track p.label; let i = $index) { <div class="h-full flex-1" (mouseenter)="hover.set(i)"></div> }
          </div>
        </div>
        <div></div>
        <div class="mt-2 flex justify-between text-2xs text-ink-faint" aria-hidden="true">
          @for (i of ticks(); track i) { <span class="num">{{ points()[i].label }}</span> }
        </div>
      </div>
    }
  `,
})
export class LineChartComponent {
  points = input.required<LinePoint[]>();
  format = input<(v: number) => string>(v => String(Math.round(v)));
  empty = input('Not enough history for this search.');
  hover = signal<number | null>(null);

  private range = computed(() => {
    const v = this.points().map(p => p.value); const min = Math.min(...v), max = Math.max(...v);
    const pad = (max - min) * 0.15 || max * 0.05 || 1;
    return { lo: Math.max(0, min - pad), hi: max + pad };
  });
  lo = computed(() => this.range().lo);
  hi = computed(() => this.range().hi);
  mid = computed(() => (this.lo() + this.hi()) / 2);
  ticks = computed(() => { const n = this.points().length; const step = Math.max(1, Math.ceil(n / 6)); return Array.from({ length: n }, (_, i) => i).filter(i => i % step === 0 || i === n - 1).filter((i, k, a) => k === a.length - 1 || a[k + 1] - i >= step * 0.6); });
  label = computed(() => this.points().map(p => `${p.label}: ${this.format()(p.value)}`).join(', '));

  x(i: number) { const n = this.points().length; return n === 1 ? 50 : (i / (n - 1)) * 100; }
  y(v: number) { const { lo, hi } = this.range(); return 100 - ((v - lo) / (hi - lo)) * 100; }
  line = computed(() => this.points().map((p, i) => `${i ? 'L' : 'M'}${this.x(i).toFixed(2)},${this.y(p.value).toFixed(2)}`).join(' '));
  area = computed(() => `${this.line()} L100,100 L0,100 Z`);
}
