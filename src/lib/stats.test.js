import { describe, expect, it } from 'vitest';
import {
  NO_GENRE_LABEL,
  OTHER_GENRE_LABEL,
  STATS_MODES,
  anchorBounds,
  anchorFor,
  booksPerMonth,
  booksPerWeek,
  booksPerPeriod,
  booksPerYear,
  genreDistribution,
  periodRange,
  periodTitle,
  shiftAnchor,
  statsRange,
  summarize,
  topRated,
} from './stats';

const TODAY = '2026-10-24';
const thisYear = statsRange('this-year', TODAY);
const lastYear = statsRange('last-year', TODAY);
const all = statsRange('all', TODAY);

const finished = (id, endDate, extra = {}) => ({ id, status: 'finished', endDate, ...extra });

describe('statsRange', () => {
  it('builds this year, last year and all', () => {
    expect(thisYear).toEqual({ key: 'this-year', year: 2026, startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(lastYear).toMatchObject({ year: 2025, startDate: '2025-01-01', endDate: '2025-12-31' });
    expect(all).toEqual({ key: 'all', year: null, startDate: null, endDate: null });
  });
});

describe('periods', () => {
  it('builds month, year and all ranges', () => {
    expect(periodRange(STATS_MODES.MONTH, '2026-02')).toEqual({
      mode: 'month', anchor: '2026-02', year: 2026, month: 2, startDate: '2026-02-01', endDate: '2026-02-28',
    });
    expect(periodRange(STATS_MODES.MONTH, '2024-02').endDate).toBe('2024-02-29');
    expect(periodRange(STATS_MODES.MONTH, '2026-11').endDate).toBe('2026-11-30');
    expect(periodRange(STATS_MODES.YEAR, '2026')).toMatchObject({ year: 2026, month: null, startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(periodRange(STATS_MODES.ALL)).toMatchObject({ mode: 'all', startDate: null, endDate: null });
  });

  it('derives anchors from a date and shifts them across year edges', () => {
    expect(anchorFor(STATS_MODES.MONTH, TODAY)).toBe('2026-10');
    expect(anchorFor(STATS_MODES.YEAR, TODAY)).toBe('2026');
    expect(anchorFor(STATS_MODES.ALL, TODAY)).toBeNull();
    expect(shiftAnchor(STATS_MODES.MONTH, '2026-01', -1)).toBe('2025-12');
    expect(shiftAnchor(STATS_MODES.MONTH, '2026-12', 1)).toBe('2027-01');
    expect(shiftAnchor(STATS_MODES.YEAR, '2026', -3)).toBe('2023');
  });

  it('titles periods in Hebrew', () => {
    expect(periodTitle(periodRange(STATS_MODES.MONTH, '2026-11'))).toBe('נובמבר 2026');
    expect(periodTitle(periodRange(STATS_MODES.YEAR, '2025'))).toBe('2025');
    expect(periodTitle(periodRange(STATS_MODES.ALL))).toBe('הכל');
  });

  it('bounds paging between the earliest finished or abandoned book and today', () => {
    const books = [
      finished('a', '2024-03-10'),
      { id: 'ab', status: 'abandoned', endDate: '2023-07-01' },
      { id: 'w', status: 'want' },
      { id: 'r', status: 'reading', startDate: '2020-01-01' },
    ];
    expect(anchorBounds(STATS_MODES.MONTH, books, TODAY)).toEqual({ first: '2023-07', last: '2026-10' });
    expect(anchorBounds(STATS_MODES.YEAR, books, TODAY)).toEqual({ first: '2023', last: '2026' });
    expect(anchorBounds(STATS_MODES.YEAR, [], TODAY)).toEqual({ first: '2026', last: '2026' });
    // A book finished "in the future" never pushes the last anchor past today.
    expect(anchorBounds(STATS_MODES.MONTH, [finished('f', '2027-01-05')], TODAY).last).toBe('2026-10');
  });

  it('counts books per week of a month, including the short last week', () => {
    const range = periodRange(STATS_MODES.MONTH, '2026-10');
    const books = [
      finished('w1', '2026-10-01'),
      finished('w1b', '2026-10-07'),
      finished('w2', '2026-10-08'),
      finished('w5', '2026-10-31'),
      finished('other', '2026-09-30'),
    ];
    expect(booksPerWeek(books, range)).toEqual([
      { key: '2026-10-w1', label: '1–7', count: 2 },
      { key: '2026-10-w2', label: '8–14', count: 1 },
      { key: '2026-10-w3', label: '15–21', count: 0 },
      { key: '2026-10-w4', label: '22–28', count: 0 },
      { key: '2026-10-w5', label: '29–31', count: 1 },
    ]);
    expect(booksPerWeek([], periodRange(STATS_MODES.MONTH, '2026-02'))).toHaveLength(4);
    expect(booksPerPeriod(books, range)).toHaveLength(5);
  });
});

describe('summarize', () => {
  const books = [
    finished('f1', '2026-01-01', { startDate: '2025-12-20', pages: 300 }),
    finished('f2', '2026-12-31', { startDate: '2026-12-01', pages: 200 }),
    finished('f3', '2026-06-15', { pages: null }),
    finished('f-old', '2025-12-31', { startDate: '2025-12-01', pages: 999 }),
    { id: 'a1', status: 'abandoned', startDate: '2026-02-01', endDate: '2026-02-10', pages: 500 },
    { id: 'a-old', status: 'abandoned', endDate: '2025-05-01' },
    { id: 'r1', status: 'reading', startDate: '2026-10-01', pages: 400 },
    { id: 'w1', status: 'want', pages: 400 },
  ];

  it('counts finished books by end date, including both year edges', () => {
    expect(summarize(books, thisYear)).toEqual({
      finished: 3,
      pages: 500,
      booksWithoutPages: 1,
      averageDays: 22,
      abandoned: 1,
    });
  });

  it('averages only books with both dates, rounded to whole days', () => {
    // f1: 20/12/2025–01/01/2026 = 13 days; f2: 01/12–31/12 = 31 days → 22.
    expect(summarize(books, thisYear).averageDays).toBe(22);
    expect(summarize([finished('x', '2026-03-01')], thisYear).averageDays).toBeNull();
    expect(
      summarize(
        [
          finished('a', '2026-03-02', { startDate: '2026-03-01' }),
          finished('b', '2026-03-03', { startDate: '2026-03-03' }),
        ],
        thisYear,
      ).averageDays,
    ).toBe(2);
  });

  it('never counts want, reading or abandoned books as finished', () => {
    const summary = summarize(books.slice(4), all);
    expect(summary.finished).toBe(0);
    expect(summary.pages).toBe(0);
    expect(summary.abandoned).toBe(2);
  });

  it('"all" has no date filter', () => {
    expect(summarize(books, all)).toMatchObject({ finished: 4, pages: 1499, abandoned: 2 });
  });

  it('last year', () => {
    expect(summarize(books, lastYear)).toMatchObject({ finished: 1, pages: 999, abandoned: 1 });
  });

  it('returns zeros for an empty list', () => {
    expect(summarize([], thisYear)).toEqual({
      finished: 0,
      pages: 0,
      booksWithoutPages: 0,
      averageDays: null,
      abandoned: 0,
    });
  });
});

describe('booksPerMonth / booksPerYear', () => {
  const books = [
    finished('a', '2026-01-05'),
    finished('b', '2026-01-28'),
    finished('c', '2026-10-01'),
    finished('d', '2025-10-01'),
    { id: 'e', status: 'abandoned', endDate: '2026-10-02' },
    finished('f', '2022-03-01'),
  ];

  it('returns twelve months with zeros, January first', () => {
    const months = booksPerMonth(books, 2026);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ key: '2026-01', label: 'ינו׳', count: 2 });
    expect(months[9]).toEqual({ key: '2026-10', label: 'אוק׳', count: 1 });
    expect(months.reduce((sum, m) => sum + m.count, 0)).toBe(3);
  });

  it('returns one entry per year, filling empty years', () => {
    expect(booksPerYear(books)).toEqual([
      { key: '2022', label: '2022', count: 1 },
      { key: '2023', label: '2023', count: 0 },
      { key: '2024', label: '2024', count: 0 },
      { key: '2025', label: '2025', count: 1 },
      { key: '2026', label: '2026', count: 3 },
    ]);
    expect(booksPerYear([])).toEqual([]);
  });

  it('uses months for a year range and years for "all"', () => {
    expect(booksPerPeriod(books, thisYear)).toHaveLength(12);
    expect(booksPerPeriod(books, all).map((p) => p.label)).toEqual([
      '2022',
      '2023',
      '2024',
      '2025',
      '2026',
    ]);
  });
});

describe('genreDistribution', () => {
  it('sorts by count, labels missing genres and ignores other years', () => {
    const books = [
      finished('1', '2026-01-01', { genre: 'מתח' }),
      finished('2', '2026-02-01', { genre: 'מתח' }),
      finished('3', '2026-03-01', { genre: 'רומן' }),
      finished('4', '2026-04-01', { genre: null }),
      finished('5', '2026-05-01', { genre: '  ' }),
      finished('6', '2025-05-01', { genre: 'רומן' }),
      { id: '7', status: 'abandoned', endDate: '2026-05-01', genre: 'רומן' },
    ];
    expect(genreDistribution(books, thisYear)).toEqual([
      { genre: NO_GENRE_LABEL, count: 2 },
      { genre: 'מתח', count: 2 },
      { genre: 'רומן', count: 1 },
    ]);
  });

  it('folds genres past the limit into "אחר"', () => {
    const books = ['א', 'ב', 'ג', 'ד', 'ה'].flatMap((genre, i) =>
      Array.from({ length: 5 - i }, (_, j) => finished(`${genre}${j}`, '2026-03-01', { genre })),
    );
    expect(genreDistribution(books, thisYear, 3)).toEqual([
      { genre: 'א', count: 5 },
      { genre: 'ב', count: 4 },
      { genre: 'ג', count: 3 },
      { genre: OTHER_GENRE_LABEL, count: 3 },
    ]);
  });
});

describe('topRated', () => {
  const books = [
    finished('three', '2026-02-01', { rating: 3 }),
    finished('five-old', '2026-01-01', { rating: 5 }),
    finished('five-new', '2026-05-01', { rating: 5 }),
    finished('unrated', '2026-06-01', { rating: null }),
    finished('four', '2026-03-01', { rating: 4 }),
    finished('last-year', '2025-03-01', { rating: 5 }),
    finished('two', '2026-04-01', { rating: 2 }),
    finished('one', '2026-04-02', { rating: 1 }),
  ];

  it('orders by rating, newest first on ties, skips unrated, limits to 5', () => {
    expect(topRated(books, thisYear).map((b) => b.id)).toEqual([
      'five-new',
      'five-old',
      'four',
      'three',
      'two',
    ]);
  });

  it('respects the range', () => {
    expect(topRated(books, lastYear).map((b) => b.id)).toEqual(['last-year']);
    expect(topRated(books, all, 2).map((b) => b.id)).toEqual(['five-new', 'five-old']);
  });
});
