import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, computed, effect, inject, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import type * as L from 'leaflet';
import { Api } from '../core/api.service';
import { count, errorText, money } from '../core/format';
import { MarketState } from '../core/market-state';
import { MapData } from '../core/models';
import { BarItem, BarListComponent } from '../shared/bar-list.component';
import { PanelComponent, StateComponent } from '../shared/ui';

@Component({
  selector: 'app-map',
  imports: [BarListComponent, PanelComponent, StateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page py-6">
      <p class="text-2xs font-medium uppercase tracking-[0.1em] text-accent">Map</p>
      <h1 class="h1 mt-1">Where the {{ state.scope().what || '' }} jobs are<span class="text-ink-faint"> · {{ state.country()?.name ?? '' }}</span></h1>

      @if (data.error()) {
        <app-state class="mt-6" tone="error" icon="ban" title="Could not load the map" [text]="err()" action="Try again" (act)="data.reload()" />
      }
      <div class="mt-5 grid gap-3 xl:grid-cols-[1fr_22rem]" [class.hidden]="!!data.error()">
        <section class="panel relative overflow-hidden" aria-label="Map of job locations">
          <div #map class="h-[420px] w-full sm:h-[560px]" data-testid="map"></div>
          @if (data.isLoading()) { <div class="absolute inset-0 grid place-items-center bg-bg/40"><div class="skeleton h-6 w-40"></div></div> }
          @if (data.value(); as d) {
            <p class="pointer-events-none absolute bottom-2 left-2 z-[500] rounded-md bg-surface/90 px-2.5 py-1.5 text-2xs text-ink-muted">
              Circles: the {{ d.sampled }} most relevant ads, sized by number of ads per place</p>
          }
        </section>
        <app-panel title="Ads per region" [hint]="data.value() ? count(data.value()!.totalJobs) + ' open jobs in total' : null">
          @if (data.value()) { <app-bar-list [items]="regions()" labelWidth="8.5rem" /> } @else { <div class="skeleton h-72"></div> }
        </app-panel>
      </div>
    </div>
  `,
})
export class MapPage implements OnDestroy {
  private api = inject(Api);
  state = inject(MarketState);
  private el = viewChild.required<ElementRef<HTMLElement>>('map');
  private leaflet?: typeof L;
  private map?: L.Map;
  private layer?: L.LayerGroup;
  count = count;
  data = rxResource({ request: () => this.state.scope(), loader: ({ request }) => this.api.map(request) });
  err = computed(() => errorText(this.data.error()));
  regions = computed<BarItem[]>(() => (this.data.value()?.regions ?? []).map(r => ({ label: r.name, value: r.count, display: count(r.count) })));

  constructor() {
    afterNextRender(async () => {
      const mod = await import('leaflet');
      // Leaflet is CommonJS: the bundler exposes it as the default export.
      this.leaflet = ((mod as unknown as { default?: typeof L }).default ?? mod) as typeof L;
      const Lf = this.leaflet;
      this.map = Lf.map(this.el().nativeElement, { zoomControl: true, attributionControl: true, scrollWheelZoom: false, worldCopyJump: true }).setView([46.6, 2.4], 5);
      Lf.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18, subdomains: 'abcd',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(this.map);
      this.layer = Lf.layerGroup().addTo(this.map);
      this.draw(this.data.value());
    });
    effect(() => this.draw(this.data.value()));
  }

  private draw(d: MapData | undefined) {
    const Lf = this.leaflet; if (!Lf || !this.map || !this.layer || !d) return;
    this.layer.clearLayers();
    const max = Math.max(1, ...d.points.map(p => p.count));
    for (const p of d.points) {
      Lf.circleMarker([p.latitude, p.longitude], {
        radius: 5 + Math.sqrt(p.count / max) * 20, color: '#101216', weight: 2, fillColor: '#4D8DFF', fillOpacity: 0.55,
      }).bindTooltip(`<b>${esc(p.name)}</b><br>${p.count} ads${p.medianSalary ? ' · median ' + money(p.medianSalary, d.currency) : ''}`, { direction: 'top' })
        .addTo(this.layer);
    }
    if (d.points.length) this.map.fitBounds(Lf.latLngBounds(d.points.map(p => [p.latitude, p.longitude] as [number, number])), { padding: [40, 40], maxZoom: 9 });
  }

  ngOnDestroy() { this.map?.remove(); }
}

function esc(s: string) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!); }
