import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GENRES,
  GENRE_ERRORS,
  addGenre,
  genreListOrDefault,
  genreSuggestions,
  genreUsage,
  normalizeGenre,
  removeGenre,
  renameGenre,
  sameGenre,
  sortGenres,
  unlistedGenres,
  validateGenreName,
} from './genres';

describe('genre names', () => {
  it('normalizes whitespace and compares without case', () => {
    expect(normalizeGenre('  מדע   בדיוני ')).toBe('מדע בדיוני');
    expect(normalizeGenre(null)).toBe('');
    expect(sameGenre('Sci-Fi', ' sci-fi ')).toBe(true);
    expect(sameGenre('מתח', 'רומן')).toBe(false);
    expect(sameGenre('', '')).toBe(false);
  });

  it('sorts alphabetically, dropping empty names and duplicates', () => {
    expect(sortGenres(['שירה', 'מתח', ' ', 'אגדות', 'מתח ', null])).toEqual(['אגדות', 'מתח', 'שירה']);
  });

  it('uses the default list until a list was saved, even an empty one', () => {
    expect(genreListOrDefault(null)).toEqual(sortGenres(DEFAULT_GENRES));
    expect(genreListOrDefault(null)[0]).toBe('ביוגרפיה');
    expect(genreListOrDefault([])).toEqual([]);
    expect(genreListOrDefault(['שירה', 'מתח'])).toEqual(['מתח', 'שירה']);
  });
});

describe('editing the list', () => {
  const list = ['מדע בדיוני', 'מתח', 'רומן'];

  it('validates a genre being added', () => {
    expect(validateGenreName(list, '  ')).toBe(GENRE_ERRORS.EMPTY);
    expect(validateGenreName(list, ' מתח ')).toBe(GENRE_ERRORS.EXISTS);
    expect(validateGenreName(list, 'שירה')).toBeNull();
  });

  it('adds and removes, keeping the list sorted', () => {
    expect(addGenre(list, ' אגדות ')).toEqual(['אגדות', 'מדע בדיוני', 'מתח', 'רומן']);
    expect(removeGenre(list, 'מתח')).toEqual(['מדע בדיוני', 'רומן']);
  });

  it('renames in place', () => {
    expect(renameGenre(list, 'מתח', 'מותחן')).toEqual({
      list: ['מדע בדיוני', 'מותחן', 'רומן'],
      to: 'מותחן',
      merged: false,
    });
  });

  it('merges into an existing genre, keeping its spelling', () => {
    expect(renameGenre(list, 'מתח', ' רומן ')).toEqual({ list: ['מדע בדיוני', 'רומן'], to: 'רומן', merged: true });
  });

  it('treats a change of letter case as a rename, not a merge', () => {
    expect(renameGenre(['sci-fi'], 'sci-fi', 'Sci-Fi')).toEqual({ list: ['Sci-Fi'], to: 'Sci-Fi', merged: false });
  });
});

describe('where genres are used', () => {
  const books = [
    { id: 'b1', genre: 'מתח' },
    { id: 'b2', genre: 'מתח ' },
    { id: 'b3', genre: 'רומן' },
    { id: 'b4', genre: 'מותחן פסיכולוגי' },
    { id: 'b5', genre: null },
  ];
  const goals = [
    { id: 'g1', type: 'genre', genre: 'מתח' },
    { id: 'g2', type: 'books', genre: null },
    { id: 'g3', type: 'genre', genre: 'רומן' },
  ];

  it('finds the books and genre goals that use a genre', () => {
    expect(genreUsage('מתח', books, goals)).toEqual({ bookIds: ['b1', 'b2'], goalIds: ['g1'] });
    expect(genreUsage('שירה', books, goals)).toEqual({ bookIds: [], goalIds: [] });
    expect(genreUsage('מתח', books)).toEqual({ bookIds: ['b1', 'b2'], goalIds: [] });
  });

  it('lists genres typed in books that are not in the list', () => {
    expect(unlistedGenres(['מתח', 'רומן'], books)).toEqual(['מותחן פסיכולוגי']);
  });

  it('suggests the list plus genres used in books', () => {
    expect(genreSuggestions(['שירה'], books)).toEqual(['מותחן פסיכולוגי', 'מתח', 'רומן', 'שירה']);
  });
});
