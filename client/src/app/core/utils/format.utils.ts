/**
 * Pure formatting utilities for consistent data display
 */

/**
 * Format salary value - returns "Insufficient data" if invalid
 */
export function formatSalary(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value) || value <= 0) {
    return 'Insufficient data';
  }
  
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k €`;
  }
  
  return `${Math.round(value).toLocaleString()} €`;
}

/**
 * Format number - returns "0" if invalid
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  return Math.round(value).toLocaleString();
}

/**
 * Format currency - returns "0 euros" if invalid
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value) || value <= 0) {
    return '0 euros';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Check if salary value is valid
 */
export function isValidSalary(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && !isNaN(value) && value > 0;
}

/**
 * Check if number value is valid
 */
export function isValidNumber(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && !isNaN(value);
}
