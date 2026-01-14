import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig, MatSnackBarRef, SimpleSnackBar } from '@angular/material/snack-bar';

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
   * Default snackbar configuration: top-right, dismissable, longer duration
   */
  private getDefaultConfig(panelClass: string[], duration: number = 12000): Partial<MatSnackBarConfig> {
    return {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [...panelClass, 'dismissable-snackbar'],
      politeness: 'polite'
    };
  }
  
  /**
   * Show a non-blocking snackbar notification
   */
  showNotification(
    message: string,
    action: string = '✕',
    duration: number = 12000,
    config?: Partial<MatSnackBarConfig>
  ): MatSnackBarRef<SimpleSnackBar> {
    const defaultConfig = this.getDefaultConfig(['custom-snackbar'], duration);
    return this.snackBar.open(message, action, {
      ...defaultConfig,
      ...config
    });
  }
  
  /**
   * Show error notification (red, top-right, 15 seconds)
   */
  showError(message: string, duration: number = 15000): MatSnackBarRef<SimpleSnackBar> {
    return this.snackBar.open(message, '✕', {
      ...this.getDefaultConfig(['error-snackbar'], duration)
    });
  }
  
  /**
   * Show info notification (blue, top-right, 12 seconds)
   */
  showInfo(message: string, duration: number = 12000): MatSnackBarRef<SimpleSnackBar> {
    return this.snackBar.open(message, '✕', {
      ...this.getDefaultConfig(['info-snackbar'], duration)
    });
  }
  
  /**
   * Show warning notification (orange, top-right, 12 seconds)
   */
  showWarning(message: string, duration: number = 12000): MatSnackBarRef<SimpleSnackBar> {
    return this.snackBar.open(message, '✕', {
      ...this.getDefaultConfig(['warning-snackbar'], duration)
    });
  }
  
  /**
   * Show success notification (green, top-right, 10 seconds)
   */
  showSuccess(message: string, duration: number = 10000): MatSnackBarRef<SimpleSnackBar> {
    return this.snackBar.open(message, '✕', {
      ...this.getDefaultConfig(['success-snackbar'], duration)
    });
  }
}
