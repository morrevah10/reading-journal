import { describe, expect, it } from 'vitest';
import { daysBetween, formatDate, toDate, toISODate, todayISO } from './dates';

describe('formatDate', () => {
  it('formats a Date as dd/MM/yyyy', () => {
    expect(formatDate(new Date(2026, 9, 24))).toBe('24/10/2026');
  });

  it('pads single-digit day and month with a leading zero', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('05/01/2026');
  });

  it('parses date-only ISO strings as local dates without shifting the day', () => {
    expect(formatDate('2026-03-01')).toBe('01/03/2026');
  });

  it('accepts a timestamp in ms', () => {
    expect(formatDate(new Date(2025, 11, 31).getTime())).toBe('31/12/2025');
  });

  it('accepts a Firestore-like Timestamp', () => {
    const timestamp = { toDate: () => new Date(2026, 6, 9) };
    expect(formatDate(timestamp)).toBe('09/07/2026');
  });

  it.each([null, undefined, '', 'not a date'])('returns an empty string for %s', (value) => {
    expect(formatDate(value)).toBe('');
  });
});

describe('toDate', () => {
  it('returns null for invalid input', () => {
    expect(toDate('garbage')).toBeNull();
  });
});

describe('toISODate / todayISO', () => {
  it('formats a local date as yyyy-MM-dd', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(todayISO(new Date(2026, 9, 24, 0, 1))).toBe('2026-10-24');
  });

  it('returns null for invalid input', () => {
    expect(toISODate(null)).toBeNull();
  });
});

describe('daysBetween', () => {
  it('counts calendar days', () => {
    expect(daysBetween('2026-10-01', '2026-10-24')).toBe(23);
    expect(daysBetween('2026-10-24', '2026-10-24')).toBe(0);
    expect(daysBetween('2026-10-24', '2026-10-01')).toBe(-23);
  });

  it('handles leap years', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });
});
