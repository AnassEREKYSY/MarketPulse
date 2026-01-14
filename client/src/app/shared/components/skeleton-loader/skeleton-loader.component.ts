import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-container" [class]="type">
      <div *ngIf="type === 'chart'" class="skeleton-chart">
        <div class="skeleton-title"></div>
        <div class="skeleton-bars">
          <div *ngFor="let i of [1,2,3,4,5,6]" class="skeleton-bar" [style.height.%]="getRandomHeight()"></div>
        </div>
      </div>
      
      <div *ngIf="type === 'card'" class="skeleton-card">
        <div class="skeleton-line" style="width: 60%;"></div>
        <div class="skeleton-line" style="width: 80%;"></div>
        <div class="skeleton-line" style="width: 40%;"></div>
      </div>
      
      <div *ngIf="type === 'list'" class="skeleton-list">
        <div *ngFor="let i of [1,2,3,4,5]" class="skeleton-item">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton-line" style="width: 70%;"></div>
            <div class="skeleton-line" style="width: 50%;"></div>
          </div>
        </div>
      </div>
      
      <div *ngIf="type === 'stat'" class="skeleton-stat">
        <div class="skeleton-icon"></div>
        <div class="skeleton-stat-content">
          <div class="skeleton-line" style="width: 50%;"></div>
          <div class="skeleton-line" style="width: 30%;"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-container {
      width: 100%;
    }
    
    .skeleton-chart {
      padding: 24px;
    }
    
    .skeleton-title {
      height: 24px;
      width: 200px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
      margin-bottom: 24px;
    }
    
    .skeleton-bars {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      height: 300px;
    }
    
    .skeleton-bar {
      flex: 1;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px 4px 0 0;
      min-height: 40px;
    }
    
    .skeleton-card {
      padding: 24px;
    }
    
    .skeleton-line {
      height: 16px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
      margin-bottom: 12px;
    }
    
    .skeleton-list {
      padding: 16px;
    }
    
    .skeleton-item {
      display: flex;
      gap: 16px;
      padding: 16px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .skeleton-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      flex-shrink: 0;
    }
    
    .skeleton-content {
      flex: 1;
    }
    
    .skeleton-stat {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
    }
    
    .skeleton-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      flex-shrink: 0;
    }
    
    .skeleton-stat-content {
      flex: 1;
    }
    
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() type: 'chart' | 'card' | 'list' | 'stat' = 'card';
  
  getRandomHeight(): number {
    // Return random height between 30% and 90%
    return Math.floor(Math.random() * 60) + 30;
  }
}
