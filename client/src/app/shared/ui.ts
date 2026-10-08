import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

/** Headline number with its label and a short note. */
@Component({
  selector: 'app-stat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="panel h-full px-4 py-3.5">
      <p class="text-2xs font-medium uppercase tracking-[0.08em] text-ink-faint">{{ label() }}</p>
      @if (loading()) { <div class="skeleton mt-2 h-7 w-24"></div> }
      @else { <p class="num mt-1.5 text-[26px] font-medium leading-none text-ink">{{ value() }}</p> }
      @if (note()) { <p class="mt-2 text-[12px] text-ink-muted">{{ note() }}</p> }
    </div>
  `,
})
export class StatComponent { label = input.required<string>(); value = input<string>('–'); note = input<string | null>(null); loading = input(false); }

/** A titled panel. Projected [actions] go to the right of the title. */
@Component({
  selector: 'app-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="panel h-full" [attr.aria-label]="title()">
      <header class="panel-head">
        <div class="min-w-0"><h2 class="h2">{{ title() }}</h2>@if (hint()) { <p class="hint mt-0.5 normal-case tracking-normal">{{ hint() }}</p> }</div>
        <div class="flex shrink-0 items-center gap-1"><ng-content select="[actions]" /></div>
      </header>
      <div class="p-4"><ng-content /></div>
    </section>
  `,
})
export class PanelComponent { title = input.required<string>(); hint = input<string | null>(null); }

/** Empty, error or "start here" message with an optional action. */
@Component({
  selector: 'app-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="panel flex flex-col items-center px-6 py-14 text-center" [attr.role]="tone() === 'error' ? 'alert' : null">
      <span class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-raised" [class]="tone() === 'error' ? 'text-down' : 'text-ink-muted'"><app-icon [name]="icon()" /></span>
      <p class="font-medium">{{ title() }}</p>
      @if (text()) { <p class="mt-1 max-w-md text-[13px] text-ink-muted">{{ text() }}</p> }
      @if (action()) { <button type="button" class="btn-secondary mt-4" (click)="act.emit()"><app-icon name="refresh" [size]="14" /> {{ action() }}</button> }
    </div>
  `,
})
export class StateComponent {
  icon = input('info'); title = input.required<string>(); text = input<string | null>(null);
  tone = input<'info' | 'error'>('info'); action = input<string | null>(null); act = output<void>();
}
