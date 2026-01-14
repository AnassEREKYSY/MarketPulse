import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { formatSalary, formatNumber, formatCurrency, isValidSalary, isValidNumber } from '../../../core/utils/format.utils';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss'
})
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: number | string = 0;
  @Input() icon: string = '';
  @Input() color: 'primary' | 'accent' | 'warn' = 'primary';
  @Input() format: 'number' | 'currency' = 'number';

  get formattedValue(): string {
    // If value is already a string, return it as-is (e.g., "Insufficient data")
    if (typeof this.value === 'string') {
      return this.value;
    }
    
    // Handle invalid numbers
    if (!isValidNumber(this.value)) {
      return this.format === 'currency' ? '0 euros' : '0';
    }
    
    // Format based on type
    if (this.format === 'currency') {
      // For currency, use formatSalary which handles "Insufficient data"
      if (!isValidSalary(this.value)) {
        return 'Insufficient data';
      }
      return formatCurrency(this.value);
    }
    
    return formatNumber(this.value);
  }
}


