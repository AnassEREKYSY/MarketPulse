import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MarketState } from './core/market-state';
import { IconComponent } from './shared/icon.component';

@Component({
  selector: 'app-shell',
  imports: [FormsModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-raised focus:px-3 focus:py-2">Skip to content</a>
    <header class="sticky top-0 z-40 border-b border-line/[0.08] bg-bg/90 backdrop-blur">
      <div class="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 lg:flex-nowrap lg:px-6">
        <a routerLink="/" [queryParams]="state.params()" class="flex items-center gap-2 lg:w-52" aria-label="MarketPulse home">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#181B20"/><path d="M5 18h5l3-8 5 14 3-6h6" fill="none" stroke="#4D8DFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="text-[15px] font-semibold tracking-[-0.01em]">MarketPulse</span>
        </a>
        <form class="order-last flex w-full flex-wrap items-center gap-2 sm:flex-nowrap lg:order-none lg:w-auto lg:flex-1" (ngSubmit)="search()" role="search" aria-label="Market search">
          <div class="relative min-w-0 basis-full sm:basis-0 sm:flex-[1.4]">
            <app-icon name="search" [size]="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input class="input pl-9" name="what" [ngModel]="what()" (ngModelChange)="what.set($event)" placeholder="Skill or job title, e.g. .NET, data engineer" aria-label="Skill or job title" data-testid="what" />
          </div>
          <input class="input min-w-0 flex-1" name="where" [ngModel]="where()" (ngModelChange)="where.set($event)" placeholder="City or region" aria-label="Location" data-testid="where" />
          <select class="select w-36 shrink-0 sm:w-44" name="country" [ngModel]="country()" (ngModelChange)="country.set($event); search()" aria-label="Country" data-testid="country">
            @for (c of state.countries(); track c.code) { <option [value]="c.code">{{ c.name }}</option> }
            @if (!state.countries().length) { <option [value]="country()">{{ country().toUpperCase() }}</option> }
          </select>
          <button type="submit" class="btn-primary shrink-0" data-testid="go"><span class="hidden sm:inline">Analyse</span><app-icon name="arrow-right" [size]="15" class="sm:hidden" /><span class="sr-only sm:hidden">Analyse</span></button>
        </form>
      </div>
      <!-- Mobile tabs -->
      <nav class="scroller flex gap-1 overflow-x-auto border-t border-line/[0.06] px-3 py-1.5 lg:hidden" aria-label="Sections">
        @for (l of links; track l.path) {
          <a [routerLink]="l.path" [queryParams]="state.params()" routerLinkActive="!bg-raised !text-ink" [routerLinkActiveOptions]="{ exact: l.path === '/' }"
             class="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-ink-muted"><app-icon [name]="l.icon" [size]="14" /> {{ l.short }}</a>
        }
      </nav>
    </header>

    <div class="mx-auto flex max-w-[1600px]">
      <aside class="sticky top-[57px] hidden h-[calc(100dvh-57px)] w-56 shrink-0 flex-col border-r border-line/[0.06] px-3 py-5 lg:flex">
        <nav class="flex flex-col gap-0.5" aria-label="Sections">
          @for (l of links; track l.path) {
            <a [routerLink]="l.path" [queryParams]="state.params()" routerLinkActive="!bg-raised !text-ink [&_.ico]:!text-accent" [routerLinkActiveOptions]="{ exact: l.path === '/' }"
               class="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink">
              <app-icon [name]="l.icon" [size]="16" class="ico text-ink-faint" /> {{ l.label }}
            </a>
          }
        </nav>
        <div class="mt-auto space-y-2 px-3 text-2xs text-ink-faint">
          <p>Live job ads, refreshed every few hours. Salaries are yearly, in local currency.</p>
          <a href="https://www.adzuna.com" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-ink-muted hover:text-ink">Jobs by Adzuna <app-icon name="external" [size]="11" /></a>
        </div>
      </aside>
      <main id="main" class="min-w-0 flex-1 pb-16"><router-outlet /></main>
    </div>
    <p class="px-4 pb-6 text-center text-2xs text-ink-faint lg:hidden">Job data: <a href="https://www.adzuna.com" target="_blank" rel="noopener" class="text-ink-muted">Jobs by Adzuna</a></p>
  `,
  styles: [`.scroller { scrollbar-width: none; } .scroller::-webkit-scrollbar { display: none; }`],
})
export class ShellComponent {
  state = inject(MarketState);
  what = signal(''); where = signal(''); country = signal('fr');
  links = [
    { path: '/', label: 'Overview', short: 'Overview', icon: 'pulse' },
    { path: '/jobs', label: 'Jobs', short: 'Jobs', icon: 'briefcase' },
    { path: '/compare', label: 'Compare skills', short: 'Compare', icon: 'scale' },
    { path: '/salaries', label: 'Salary explorer', short: 'Salaries', icon: 'coins' },
    { path: '/countries', label: 'Countries', short: 'Countries', icon: 'globe' },
    { path: '/map', label: 'Map', short: 'Map', icon: 'map' },
  ];
  constructor() {
    // Keep the form in sync with the URL (back/forward, shared links).
    effect(() => { const s = this.state.scope(); this.what.set(s.what); this.where.set(s.where); this.country.set(s.country); });
  }
  search() { this.state.set({ what: this.what().trim(), where: this.where().trim(), country: this.country() }); }
}
