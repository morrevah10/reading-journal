import { describe, expect, it } from 'vitest';
import { readingDays } from './readingDays';

const TODAY = '2026-10-24';

describe('readingDays', () => {
  it('counts finished books inclusively', () => {
    expect(
      readingDays({ status: 'finished', startDate: '2026-10-01', endDate: '2026-10-10' }, TODAY),
    ).toBe(10);
  });

  it('is 1 when started and finished on the same day', () => {
    expect(
      readingDays({ status: 'finished', startDate: '2026-10-05', endDate: '2026-10-05' }, TODAY),
    ).toBe(1);
  });

  it('counts up to today while reading', () => {
    expect(readingDays({ status: 'reading', startDate: '2026-10-20' }, TODAY)).toBe(5);
  });

  it('counts abandoned books up to the abandon date', () => {
    expect(
      readingDays({ status: 'abandoned', startDate: '2026-10-01', endDate: '2026-10-03' }, TODAY),
    ).toBe(3);
  });

  it('crosses month and year boundaries', () => {
    expect(
      readingDays({ status: 'finished', startDate: '2025-12-30', endDate: '2026-01-02' }, TODAY),
    ).toBe(4);
  });

  it('crosses a daylight saving change without drifting', () => {
    expect(
      readingDays({ status: 'finished', startDate: '2026-03-20', endDate: '2026-03-31' }, TODAY),
    ).toBe(12);
  });

  it('returns null without a start date', () => {
    expect(readingDays({ status: 'finished', startDate: null, endDate: '2026-10-10' }, TODAY))
      .toBeNull();
    expect(readingDays({ status: 'want' }, TODAY)).toBeNull();
  });

  it('returns null for an invalid range', () => {
    expect(
      readingDays({ status: 'finished', startDate: '2026-10-10', endDate: '2026-10-01' }, TODAY),
    ).toBeNull();
  });
});
