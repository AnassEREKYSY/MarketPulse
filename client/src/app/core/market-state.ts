import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { Api, Scope } from './api.service';
import { Country } from './models';

export const DEFAULT_SCOPE: Scope = { country: 'fr', what: 'developer', where: '' };
const KEY = 'marketpulse_scope';

/**
 * The search every screen looks at (country, keywords, location). It lives in the URL (?c=&q=&l=)
 * so any view can be shared, and the last one is remembered for the next visit.
 */
@Injectable({ providedIn: 'root' })
export class MarketState {
  private router = inject(Router);
  private api = inject(Api);
  readonly countries = toSignal(this.api.countries(), { initialValue: [] as Country[] });

  private url = toSignal(this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(() => this.router.routerState.snapshot.root.queryParamMap)));
  readonly scope = computed<Scope>(() => {
    const q = this.url();
    const saved = remembered();
    const s: Scope = {
      country: (q?.get('c') || saved.country || DEFAULT_SCOPE.country).toLowerCase(),
      what: q?.has('q') ? q.get('q')! : saved.what ?? DEFAULT_SCOPE.what,
      where: q?.has('l') ? q.get('l')! : saved.where ?? '',
    };
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
    return s;
  });
  readonly country = computed(() => this.countries().find(c => c.code === this.scope().country) ?? null);
  readonly ready = signal(true);

  /** Changes the search and keeps the current screen. */
  set(patch: Partial<Scope>) {
    const s = { ...this.scope(), ...patch };
    this.router.navigate([], { queryParams: { c: s.country, q: s.what || null, l: s.where || null, page: null }, queryParamsHandling: 'merge' });
  }

  /** Query params to keep the search when moving between screens. */
  readonly params = computed(() => { const s = this.scope(); return { c: s.country, q: s.what || null, l: s.where || null }; });
}

function remembered(): Partial<Scope> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}
