// Export and genre changes on real books, checked against stats and goal progress.
import { describe, expect, it } from 'vitest';
import { REAL_BOOKS, REAL_GOALS, REAL_NOTES, REAL_QUOTES } from '../test/fixtures/realBooks';
import { buildExport, exportToJson } from './exportData';
import { DEFAULT_GENRES, genreListOrDefault, genreUsage, removeGenre, renameGenre, unlistedGenres } from './genres';
import { GOAL_TYPES, goalProgress } from './goals';
import { NO_GENRE_LABEL, STATS_RANGES, genreDistribution, statsRange, summarize } from './stats';

const TODAY = '2026-10-24';
const year = statsRange(STATS_RANGES.THIS_YEAR, TODAY);
const list = genreListOrDefault(null);
const scifiGoal = REAL_GOALS.find((goal) => goal.type === GOAL_TYPES.GENRE);

// What the batch in firebase/genreUpdates.js does to the documents.
function applyGenre(docs, ids, genre) {
  return docs.map((doc) => (ids.includes(doc.id) ? { ...doc, genre } : doc));
}

const distribution = (books) =>
  Object.fromEntries(genreDistribution(books, year, 20).map(({ genre, count }) => [genre, count]));

describe('real books — export', () => {
  const data = buildExport(
    { books: REAL_BOOKS, notes: REAL_NOTES, quotes: REAL_QUOTES, goals: REAL_GOALS, genres: list },
    new Date(`${TODAY}T10:00:00Z`),
  );

  it('includes every book, note, quote and goal', () => {
    expect(data.counts).toEqual({ books: 9, notes: 3, quotes: 1, goals: 2 });
    expect(data.books.map((book) => book.title)).toContain('סיפור על אהבה וחושך');
    expect(data.settings.genres).toHaveLength(DEFAULT_GENRES.length);
  });

  it('keeps saved covers, cover links, Hebrew text and ISBNs', () => {
    const oz = data.books.find((book) => book.id === 'oz-love');
    expect(oz.coverData).toMatch(/^data:image\/webp;base64,/);
    expect(oz.coverUrl).toContain('keter-books.co.il');
    expect(oz.isbn).toBe('9650710744');
    expect(oz.notes.map((note) => note.text)).toEqual(['הפרק על הספרייה של הסבא.', 'הקשר בין הבית לבין ירושלים.']);
    expect(data.books.find((book) => book.id === 'dune').quotes[0]).toMatchObject({ page: 8 });
  });

  it('keeps every status with its own fields', () => {
    const byId = Object.fromEntries(data.books.map((book) => [book.id, book]));
    expect(byId['my-michael']).toMatchObject({ status: 'abandoned', abandonReason: 'לא הגיע לי עכשיו.' });
    expect(byId['1984']).toMatchObject({ status: 'reading', endDate: null, rating: null, review: 'מפחיד כמה שהוא רלוונטי.' });
    expect(byId['midnight-library']).toMatchObject({ status: 'want', genre: null });
  });

  it('writes dates as ISO strings and reads back the same', () => {
    expect(data.books[0].createdAt).toBe('2025-05-01T10:00:00.000Z');
    expect(JSON.parse(exportToJson(data))).toEqual(data);
  });
});

describe('real books — genre changes', () => {
  it('finds the free-typed genre that is not in the list', () => {
    expect(unlistedGenres(list, REAL_BOOKS)).toEqual(['מותחן פסיכולוגי']);
  });

  it('renaming everywhere keeps the stats and the genre goal on track', () => {
    const usage = genreUsage('מדע בדיוני', REAL_BOOKS, REAL_GOALS);
    expect(usage).toEqual({ bookIds: ['dune', 'foundation', '1984'], goalIds: ['scifi-2026'] });
    const before = goalProgress(scifiGoal, REAL_BOOKS);
    expect(before.current).toBe(2);

    const plan = renameGenre(list, 'מדע בדיוני', 'מד"ב');
    const books = applyGenre(REAL_BOOKS, usage.bookIds, plan.to);
    const goals = applyGenre(REAL_GOALS, usage.goalIds, plan.to);

    expect(plan.list).toContain('מד"ב');
    expect(plan.list).not.toContain('מדע בדיוני');
    expect(distribution(books)['מד"ב']).toBe(2);
    expect(distribution(books)['מדע בדיוני']).toBeUndefined();
    expect(goalProgress(goals.find((goal) => goal.id === 'scifi-2026'), books)).toEqual(before);
    expect(summarize(books, year)).toEqual(summarize(REAL_BOOKS, year));
  });

  it('renaming only the list leaves books and goals as they were', () => {
    const plan = renameGenre(list, 'מדע בדיוני', 'מד"ב');
    expect(unlistedGenres(plan.list, REAL_BOOKS)).toEqual(['מדע בדיוני', 'מותחן פסיכולוגי']);
    expect(goalProgress(scifiGoal, REAL_BOOKS).current).toBe(2);
  });

  it('merging a genre into another adds up its books', () => {
    const plan = renameGenre(list, 'פנטזיה', 'מדע בדיוני');
    expect(plan.merged).toBe(true);
    const usage = genreUsage('פנטזיה', REAL_BOOKS, REAL_GOALS);
    const books = applyGenre(REAL_BOOKS, usage.bookIds, plan.to);
    expect(distribution(books)['מדע בדיוני']).toBe(3);
    expect(goalProgress(scifiGoal, books).current).toBe(3);
  });

  it('removing a genre from books moves them to "no genre"', () => {
    const usage = genreUsage('רומן', REAL_BOOKS, REAL_GOALS);
    // The abandoned book has the genre too, but only finished books are in the stats.
    expect(usage.bookIds).toEqual(['oz-love', 'my-michael']);
    const books = applyGenre(REAL_BOOKS, usage.bookIds, null);
    expect(removeGenre(list, 'רומן')).not.toContain('רומן');
    expect(distribution(books)['רומן']).toBeUndefined();
    expect(distribution(books)[NO_GENRE_LABEL]).toBe(1);
  });
});
