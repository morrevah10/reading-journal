import { describe, expect, it } from 'vitest';
import {
  matchesQuery,
  readingBooks,
  shelfBooks,
  shelfGenres,
  shelfYears,
  wantToReadBooks,
} from './shelf';

const books = [
  { id: 'r1', status: 'reading', title: 'Reading Old', startDate: '2026-09-01' },
  { id: 'r2', status: 'reading', title: 'Reading New', startDate: '2026-10-01' },
  { id: 'w1', status: 'want', title: 'Wanted' },
  { id: 'f1', status: 'finished', title: 'Dune', author: 'Frank Herbert', genre: 'מדע בדיוני', endDate: '2025-05-01' },
  { id: 'f2', status: 'finished', title: 'סאפיינס', author: 'יובל נח הררי', genre: 'עיון', endDate: '2026-08-15' },
  { id: 'f3', status: 'finished', title: 'Foundation', author: 'Asimov', genre: 'מדע בדיוני', endDate: '2026-02-01' },
  { id: 'a1', status: 'abandoned', title: 'Ulysses', author: 'Joyce', genre: 'רומן', endDate: '2026-03-01' },
];

const ids = (list) => list.map((book) => book.id);

describe('readingBooks', () => {
  it('returns only reading books, most recently started first', () => {
    expect(ids(readingBooks(books))).toEqual(['r2', 'r1']);
  });

  it('applies the search query', () => {
    expect(ids(readingBooks(books, 'old'))).toEqual(['r1']);
  });
});

describe('shelfBooks', () => {
  it('defaults to finished books, newest end date first', () => {
    expect(ids(shelfBooks(books))).toEqual(['f2', 'f3', 'f1']);
  });

  it('filters abandoned books', () => {
    expect(ids(shelfBooks(books, { status: 'abandoned' }))).toEqual(['a1']);
  });

  it('"all" combines finished and abandoned, never want or reading', () => {
    expect(ids(shelfBooks(books, { status: 'all' }))).toEqual(['f2', 'a1', 'f3', 'f1']);
  });

  it('filters by genre', () => {
    expect(ids(shelfBooks(books, { genre: 'מדע בדיוני' }))).toEqual(['f3', 'f1']);
  });

  it('filters by the year of the end date', () => {
    expect(ids(shelfBooks(books, { year: '2025' }))).toEqual(['f1']);
    expect(ids(shelfBooks(books, { status: 'all', year: 2026 }))).toEqual(['f2', 'a1', 'f3']);
  });

  it('searches title and author, case-insensitively, including Hebrew', () => {
    expect(ids(shelfBooks(books, { query: 'herbert' }))).toEqual(['f1']);
    expect(ids(shelfBooks(books, { query: 'הררי' }))).toEqual(['f2']);
    expect(ids(shelfBooks(books, { query: 'FOUND' }))).toEqual(['f3']);
  });

  it('combines filters', () => {
    expect(ids(shelfBooks(books, { status: 'all', genre: 'מדע בדיוני', year: '2026' }))).toEqual([
      'f3',
    ]);
  });
});

describe('wantToReadBooks', () => {
  const ts = (ms) => ({ toMillis: () => ms });

  it('returns only want books, most recently added first', () => {
    const list = [
      { id: 'w-old', status: 'want', createdAt: ts(1000) },
      { id: 'r', status: 'reading', createdAt: ts(5000) },
      { id: 'w-new', status: 'want', createdAt: ts(3000) },
      { id: 'w-mid', status: 'want', createdAt: new Date(2000) },
    ];
    expect(ids(wantToReadBooks(list))).toEqual(['w-new', 'w-mid', 'w-old']);
  });

  it('puts a just-added book without a timestamp first', () => {
    const list = [
      { id: 'w1', status: 'want', createdAt: ts(1000) },
      { id: 'pending', status: 'want', createdAt: null },
    ];
    expect(ids(wantToReadBooks(list))).toEqual(['pending', 'w1']);
  });

  it('returns [] when there are no want books', () => {
    expect(wantToReadBooks(books.filter((b) => b.status !== 'want'))).toEqual([]);
  });
});

describe('shelfYears / shelfGenres', () => {
  it('lists end-date years of shelf books, newest first', () => {
    expect(shelfYears(books)).toEqual(['2026', '2025']);
  });

  it('lists distinct genres', () => {
    expect(shelfGenres(books)).toHaveLength(3);
    expect(shelfGenres(books)).toEqual(expect.arrayContaining(['עיון', 'רומן', 'מדע בדיוני']));
  });
});

describe('matchesQuery', () => {
  it('matches everything for an empty query', () => {
    expect(matchesQuery({ title: 'x' }, '   ')).toBe(true);
  });

  it('handles books without an author', () => {
    expect(matchesQuery({ title: 'Dune', author: null }, 'herbert')).toBe(false);
  });
});
