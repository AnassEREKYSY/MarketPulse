import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export interface EmptyStateConfig {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  action?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class UiStateService {
  private snackBar = inject(MatSnackBar);
  
  /**
   * Show a non-blocking snackbar notification
   */
  showNotification(
    message: string,
    action: string = 'Close',
    duration: number = 4000,
    config?: Partial<MatSnackBarConfig>
  ): void {
    this.snackBar.open(message, action, {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['custom-snackbar'],
      ...config
    });
  }
  
  /**
   * Show error notification
   */
  showError(message: string, duration: number = 5000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar'],
    });
  }
  
  /**
   * Show info notification
   */
  showInfo(message: string, duration: number = 4000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['info-snackbar'],
    });
  }
  
  /**
   * Show warning notification
   */
  showWarning(message: string, duration: number = 4000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['warning-snackbar'],
    });
  }
  
  /**
   * Show success notification
   */
  showSuccess(message: string, duration: number = 3000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['success-snackbar'],
    });
  }
}
