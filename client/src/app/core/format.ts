import { Pipe, PipeTransform } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

const nf = new Map<string, Intl.NumberFormat>();
function fmt(key: string, make: () => Intl.NumberFormat) { if (!nf.has(key)) nf.set(key, make()); return nf.get(key)!; }

/** 54200 EUR → "€54.2K"; full=true → "€54,200". */
export function money(v: number | null | undefined, currency = 'EUR', full = false) {
  if (v === null || v === undefined || !isFinite(v)) return '–';
  try {
    return fmt(`${currency}${full}`, () => new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: full ? 0 : 1, ...(full ? {} : { notation: 'compact' }) })).format(v);
  } catch { return Math.round(v).toLocaleString('en'); }
}
export const count = (v: number | null | undefined) => (v === null || v === undefined ? '–' : fmt('n', () => new Intl.NumberFormat('en')).format(v));
export const compactCount = (v: number | null | undefined) => (v === null || v === undefined ? '–' : fmt('c', () => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })).format(v));
export const pct = (v: number | null | undefined) => (v === null || v === undefined ? '–' : `${Math.round(v)}%`);

export function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (!isFinite(d) || d < 0) return '';
  if (d < 1 / 24) return 'just now';
  if (d < 1) return `${Math.max(1, Math.round(d * 24))}h ago`;
  if (d < 2) return 'yesterday';
  if (d < 30) return `${Math.floor(d)} days ago`;
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export function salaryRange(min: number | null, max: number | null, currency: string) {
  if (!min && !max) return null;
  if (min && max && Math.abs(max - min) > 1) return `${money(min, currency)} – ${money(max, currency)}`;
  return money(min || max, currency);
}

export const errorText = (e: unknown, fallback = 'Something went wrong. Please try again.') =>
  (e instanceof HttpErrorResponse && (e.error?.error as string)) || (e instanceof HttpErrorResponse && e.status === 0 ? 'Cannot reach the server.' : fallback);

@Pipe({ name: 'money' }) export class MoneyPipe implements PipeTransform { transform(v: number | null | undefined, c = 'EUR', full = false) { return money(v, c, full); } }
@Pipe({ name: 'count' }) export class CountPipe implements PipeTransform { transform(v: number | null | undefined) { return count(v); } }
@Pipe({ name: 'compact' }) export class CompactPipe implements PipeTransform { transform(v: number | null | undefined) { return compactCount(v); } }
@Pipe({ name: 'pct' }) export class PctPipe implements PipeTransform { transform(v: number | null | undefined) { return pct(v); } }
@Pipe({ name: 'ago' }) export class AgoPipe implements PipeTransform { transform(v: string) { return ago(v); } }
