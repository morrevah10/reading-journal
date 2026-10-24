import { describe, expect, it } from 'vitest';
import { SAVE_MODES, coverSource, createBook, normalizeBookInput, validateBook } from './bookModel';

const TODAY = '2026-10-24';

describe('normalizeBookInput', () => {
  it('trims text, turns empty strings into null and parses pages', () => {
    expect(
      normalizeBookInput({ title: '  Dune ', author: '', genre: ' ', pages: '412', summary: 'x' }),
    ).toEqual({ title: 'Dune', author: null, genre: null, pages: 412, summary: 'x' });
  });

  it.each(['', '0', '-3', 'abc'])('pages %j becomes null', (pages) => {
    expect(normalizeBookInput({ pages }).pages).toBeNull();
  });

  it('keeps an empty title as an empty string so validation catches it', () => {
    expect(normalizeBookInput({ title: '   ' }).title).toBe('');
  });
});

describe('createBook', () => {
  const input = { title: 'Dune', author: 'Frank Herbert', pages: '412', coverUrl: 'https://x' };

  it('"start now" creates a reading book starting today', () => {
    expect(createBook(input, SAVE_MODES.START, TODAY)).toMatchObject({
      title: 'Dune',
      author: 'Frank Herbert',
      pages: 412,
      coverUrl: 'https://x',
      coverData: null,
      status: 'reading',
      startDate: TODAY,
      endDate: null,
      rating: null,
      tags: [],
    });
  });

  it('"start now" uses a chosen start date', () => {
    expect(createBook({ ...input, startDate: '2026-10-20' }, SAVE_MODES.START, TODAY).startDate)
      .toBe('2026-10-20');
  });

  it('"want to read" creates a want book without dates', () => {
    expect(createBook({ ...input, startDate: TODAY }, SAVE_MODES.WANT, TODAY)).toMatchObject({
      status: 'want',
      startDate: null,
      endDate: null,
    });
  });
});

describe('validateBook', () => {
  const valid = { title: 'Dune', status: 'reading', startDate: TODAY, rating: null };

  it('accepts a valid book', () => {
    expect(validateBook(valid)).toEqual({});
  });

  it.each(['', '   ', undefined])('requires a title (%j)', (title) => {
    expect(validateBook({ ...valid, title })).toHaveProperty('title');
  });

  it('requires a start date while reading', () => {
    expect(validateBook({ ...valid, startDate: null })).toHaveProperty('startDate');
  });

  it('requires an end date when finished or abandoned', () => {
    expect(validateBook({ ...valid, status: 'finished', endDate: null })).toHaveProperty('endDate');
    expect(validateBook({ ...valid, status: 'abandoned', endDate: null })).toHaveProperty(
      'endDate',
    );
  });

  it('rejects an end date before the start date', () => {
    expect(
      validateBook({ ...valid, status: 'finished', startDate: TODAY, endDate: '2026-10-01' }),
    ).toHaveProperty('endDate');
  });

  it('allows a rating only on finished books', () => {
    expect(validateBook({ ...valid, rating: 4 })).toHaveProperty('rating');
    expect(validateBook({ ...valid, status: 'finished', endDate: TODAY, rating: 4 })).toEqual({});
  });

  it('rejects ratings outside 1–5', () => {
    expect(
      validateBook({ ...valid, status: 'finished', endDate: TODAY, rating: 7 }),
    ).toHaveProperty('rating');
  });
});

describe('coverSource', () => {
  it('prefers the uploaded cover over the Google link', () => {
    expect(coverSource({ coverData: 'data:image/webp;base64,x', coverUrl: 'https://g' })).toBe(
      'data:image/webp;base64,x',
    );
    expect(coverSource({ coverData: null, coverUrl: 'https://g' })).toBe('https://g');
    expect(coverSource({})).toBeNull();
  });
});
