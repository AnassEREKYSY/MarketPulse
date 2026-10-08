import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarItem { label: string; value: number; display: string; sub?: string; }

/** Horizontal bars with the value written next to each: the label carries identity, one hue only. */
@Component({
  selector: 'app-bar-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ul class="space-y-2">
      @for (it of items(); track it.label) {
        <li class="group grid grid-cols-[minmax(0,var(--lw))_1fr_auto] items-center gap-3 text-[13px]" [style.--lw]="labelWidth()" [attr.title]="it.label + ': ' + it.display + (it.sub ? ' (' + it.sub + ')' : '')">
          <span class="truncate text-ink-muted group-hover:text-ink">{{ it.label }}</span>
          <span class="relative h-2 rounded-r-[4px] bg-line/[0.05]">
            <span class="absolute inset-y-0 left-0 rounded-r-[4px] bg-accent transition-[width] duration-500 group-hover:bg-accent-hover" [style.width.%]="width(it.value)"></span>
          </span>
          <span class="num min-w-[3.5rem] text-right text-[12px] text-ink">{{ it.display }}@if (it.sub) { <span class="ml-1 text-ink-faint">{{ it.sub }}</span> }</span>
        </li>
      } @empty { <li class="text-[13px] text-ink-faint">{{ empty() }}</li> }
    </ul>
  `,
})
export class BarListComponent {
  items = input.required<BarItem[]>();
  labelWidth = input('10rem');
  empty = input('No data for this search.');
  /** Optional shared maximum, so several lists can be compared. */
  max = input<number | null>(null);
  private top = computed(() => this.max() ?? Math.max(0, ...this.items().map(i => i.value)));
  width(v: number) { const m = this.top(); return m > 0 ? Math.max(1.5, (v / m) * 100) : 0; }
}
