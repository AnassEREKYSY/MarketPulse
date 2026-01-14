import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="empty-state">
      <mat-icon class="empty-icon">{{ icon }}</mat-icon>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-message">{{ message }}</p>
      <button 
        *ngIf="actionLabel && action" 
        mat-raised-button 
        color="primary" 
        (click)="action()"
        class="empty-action">
        {{ actionLabel }}
      </button>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      min-height: 300px;
    }
    
    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #94a3b8;
      margin-bottom: 16px;
    }
    
    .empty-title {
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 8px 0;
    }
    
    .empty-message {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 24px 0;
      max-width: 400px;
    }
    
    .empty-action {
      margin-top: 8px;
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon: string = 'inbox';
  @Input() title: string = 'No data available';
  @Input() message: string = 'There is no data to display at this time.';
  @Input() actionLabel?: string;
  @Input() action?: () => void;
}
