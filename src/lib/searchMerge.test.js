import { describe, expect, it } from 'vitest';
import { isHebrew, mergeResults, sameBook, textKey } from './searchMerge';
import { cleanIsbn, toIsbn13 } from './isbn';

const google = (extra) => ({ source: 'google', author: null, pages: null, thumbnailUrl: null, isbn: null, ...extra });
const nli = (extra) => ({ source: 'nli', author: null, pages: null, thumbnailUrl: null, isbn: null, ...extra });

describe('isbn', () => {
  it('cleans and converts ISBN-10 to ISBN-13', () => {
    expect(cleanIsbn('978-0-441-01359-3')).toBe('9780441013593');
    expect(cleanIsbn('0-441-01359-7')).toBe('0441013597');
    expect(cleanIsbn('965072345x')).toBe('965072345X');
    expect(cleanIsbn('123')).toBeNull();
    expect(cleanIsbn(null)).toBeNull();
    expect(toIsbn13('0441013597')).toBe('9780441013593');
    expect(toIsbn13('9780441013593')).toBe('9780441013593');
    expect(toIsbn13('nope')).toBeNull();
  });
});

describe('text helpers', () => {
  it('detects Hebrew and builds comparable keys', () => {
    expect(isHebrew('דיונה')).toBe(true);
    expect(isHebrew('Dune 2')).toBe(false);
    expect(textKey('  Dune: Messiah! ')).toBe('dune messiah');
    expect(textKey('שָׁלוֹם')).toBe('שלום');
  });
});

describe('sameBook', () => {
  it('matches by ISBN, including ISBN-10 against ISBN-13', () => {
    expect(sameBook(google({ title: 'A', isbn: '0441013597' }), nli({ title: 'B', isbn: '9780441013593' }))).toBe(true);
    expect(sameBook(google({ title: 'Dune', isbn: '9780441013593' }), nli({ title: 'Dune', isbn: '9789650000000' }))).toBe(false);
  });

  it('otherwise matches by title and a shared author name', () => {
    expect(sameBook(google({ title: 'דיונה', author: 'פרנק הרברט' }), nli({ title: 'דיונה', author: 'הרברט, פרנק' }))).toBe(true);
    expect(sameBook(google({ title: 'דיונה', author: 'פרנק הרברט' }), nli({ title: 'דיונה', author: 'מישהו אחר' }))).toBe(false);
    expect(sameBook(google({ title: 'דיונה' }), nli({ title: 'דיונה', author: 'הרברט, פרנק' }))).toBe(true);
    expect(sameBook(google({ title: 'Dune' }), nli({ title: 'Dune Messiah' }))).toBe(false);
  });
});

describe('mergeResults', () => {
  const g1 = google({ id: 'google:1', title: 'דיונה', author: 'פרנק הרברט', pages: 600, thumbnailUrl: 'https://books.google.com/1', isbn: '9789650723456' });
  const g2 = google({ id: 'google:2', title: 'Dune', author: 'Frank Herbert', pages: 412 });
  const n1 = nli({ id: 'nli:1', title: 'דיונה', author: 'הרברט, פרנק', isbn: '978-965-07-2345-6', year: 2019 });
  const n2 = nli({ id: 'nli:2', title: 'ילדי דיונה', author: 'הרברט, פרנק' });

  it('puts the National Library first for Hebrew queries and Google first otherwise', () => {
    expect(mergeResults([g2], [n2], 'דיונה').map((r) => r.id)).toEqual(['nli:2', 'google:2']);
    expect(mergeResults([g2], [n2], 'dune').map((r) => r.id)).toEqual(['google:2', 'nli:2']);
  });

  it('merges duplicates, filling missing fields from the other source', () => {
    const merged = mergeResults([g1, g2], [n1, n2], 'דיונה');
    expect(merged).toHaveLength(3);
    expect(merged[0]).toMatchObject({
      id: 'nli:1',
      title: 'דיונה',
      author: 'הרברט, פרנק',
      pages: 600,
      thumbnailUrl: 'https://books.google.com/1',
      year: 2019,
      sources: ['nli', 'google'],
    });
  });

  it('handles one empty source', () => {
    expect(mergeResults([g2], [], 'dune')).toEqual([{ ...g2, sources: ['google'] }]);
    expect(mergeResults([], [], 'x')).toEqual([]);
  });
});
