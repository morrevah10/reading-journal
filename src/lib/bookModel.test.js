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

describe('createBook — already read (history)', () => {
  const input = {
    title: 'Old Book',
    startDate: '2024-01-10',
    endDate: '2024-02-01',
    rating: 4,
    review: '  worth it ',
  };

  it('creates a finished book with dates, rating and review', () => {
    expect(createBook(input, SAVE_MODES.FINISHED, TODAY)).toMatchObject({
      title: 'Old Book',
      status: 'finished',
      startDate: '2024-01-10',
      endDate: '2024-02-01',
      rating: 4,
      review: 'worth it',
      abandonReason: null,
    });
  });

  it('leaves the start date null when not given (never defaults to today)', () => {
    const book = createBook({ ...input, startDate: '' }, SAVE_MODES.FINISHED, TODAY);
    expect(book.startDate).toBeNull();
    expect(validateBook(book, TODAY)).toEqual({});
  });

  it('allows no rating and no review', () => {
    const book = createBook(
      { title: 'X', endDate: '2024-02-01', rating: null, review: '' },
      SAVE_MODES.FINISHED,
      TODAY,
    );
    expect(book).toMatchObject({ rating: null, review: null });
    expect(validateBook(book, TODAY)).toEqual({});
  });

  it('requires an end date', () => {
    const book = createBook({ title: 'X', endDate: '' }, SAVE_MODES.FINISHED, TODAY);
    expect(book.endDate).toBeNull();
    expect(validateBook(book, TODAY)).toHaveProperty('endDate');
  });

  it('rejects an end date before the start date', () => {
    const book = createBook(
      { ...input, startDate: '2024-03-01', endDate: '2024-02-01' },
      SAVE_MODES.FINISHED,
      TODAY,
    );
    expect(validateBook(book, TODAY)).toHaveProperty('endDate');
  });

  it('ignores rating and review in the other modes', () => {
    expect(createBook(input, SAVE_MODES.START, TODAY)).toMatchObject({
      status: 'reading',
      endDate: null,
      rating: null,
      review: null,
    });
  });
});

describe('validateBook — future dates', () => {
  it('rejects a future end date', () => {
    expect(
      validateBook(
        { title: 'X', status: 'finished', startDate: TODAY, endDate: '2026-10-25' },
        TODAY,
      ),
    ).toEqual({ endDate: 'התאריך לא יכול להיות בעתיד' });
  });

  it('rejects a future start date', () => {
    expect(validateBook({ title: 'X', status: 'reading', startDate: '2026-11-01' }, TODAY))
      .toHaveProperty('startDate', 'התאריך לא יכול להיות בעתיד');
  });

  it('accepts today', () => {
    expect(
      validateBook({ title: 'X', status: 'finished', startDate: TODAY, endDate: TODAY }, TODAY),
    ).toEqual({});
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
