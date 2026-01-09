import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobsService } from '../../core/services/jobs.service';
import { HeatMapData } from '../../core/models/statistics.model';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import * as L from 'leaflet';

@Component({
  selector: 'app-maps',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule
  ],
  templateUrl: './maps.component.html',
  styleUrl: './maps.component.scss'
})
export class MapsComponent implements OnInit, AfterViewInit {
  private jobsService = inject(JobsService);
  
  heatMapData: HeatMapData | null = null;
  loading = true;
  error: string | null = null;
  mapType: 'jobs' | 'salary' = 'jobs';
  
  private map: L.Map | null = null;
  private markers: L.Marker[] = [];

  ngOnInit() {
    this.loadHeatMapData();
  }

  ngAfterViewInit() {
    this.initMap();
  }

  initMap() {
    this.map = L.map('map').setView([46.6034, 1.8883], 6); // Center on France

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    if (this.heatMapData) {
      this.updateMap();
    }
  }

  loadHeatMapData() {
    this.loading = true;
    this.error = null;

    this.jobsService.getHeatMapData(undefined, this.mapType).subscribe({
      next: (data) => {
        this.heatMapData = data;
        this.loading = false;
        if (this.map) {
          this.updateMap();
        }
      },
      error: (err) => {
        this.error = 'Failed to load heatmap data';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onMapTypeChange() {
    this.loadHeatMapData();
  }

  updateMap() {
    if (!this.map || !this.heatMapData) return;

    // Clear existing markers
    this.markers.forEach(marker => this.map!.removeLayer(marker));
    this.markers = [];

    // Add markers for each point
    this.heatMapData.points.forEach(point => {
      const intensity = point.intensity / 100;
      const color = this.mapType === 'jobs' 
        ? `rgba(25, 118, 210, ${intensity})`
        : `rgba(66, 165, 245, ${intensity})`;

      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: Math.max(5, point.jobCount / 10),
        fillColor: color,
        color: '#1976d2',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.6
      });

      const popupContent = `
        <div style="padding: 8px;">
          <strong>${point.city}, ${point.country}</strong><br>
          Jobs: ${point.jobCount}<br>
          ${point.averageSalary ? `Avg Salary: ${point.averageSalary.toFixed(0)} EUR/year` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(this.map!);
      this.markers.push(marker);
    });
  }
}

