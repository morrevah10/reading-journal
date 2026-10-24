import { describe, expect, it } from 'vitest';
import { timestamp } from '../test/fixtures/realBooks';
import {
  EXPORT_VERSION,
  buildExport,
  exportFileName,
  exportToJson,
  formatFileSize,
  toPlain,
} from './exportData';

const NOW = new Date('2026-10-24T09:30:00Z');

describe('toPlain', () => {
  it('turns Timestamps and Dates into ISO strings, deeply', () => {
    expect(
      toPlain({
        createdAt: timestamp('2026-01-01T08:00:00Z'),
        nested: [{ at: new Date('2026-02-02T00:00:00Z') }],
        title: 'Dune',
        pages: 896,
        tags: [],
        rating: null,
      }),
    ).toEqual({
      createdAt: '2026-01-01T08:00:00.000Z',
      nested: [{ at: '2026-02-02T00:00:00.000Z' }],
      title: 'Dune',
      pages: 896,
      tags: [],
      rating: null,
    });
  });
});

describe('buildExport', () => {
  const books = [
    { id: 'b2', title: 'Second', coverData: 'data:image/webp;base64,AAA', createdAt: timestamp('2026-02-01T00:00:00Z') },
    { id: 'b1', title: 'First', createdAt: timestamp('2026-01-01T00:00:00Z') },
  ];
  const notes = {
    b1: [
      { id: 'n2', text: 'later', createdAt: timestamp('2026-01-03T00:00:00Z') },
      { id: 'n1', text: 'earlier', createdAt: timestamp('2026-01-02T00:00:00Z') },
    ],
  };
  const quotes = { b2: [{ id: 'q1', text: 'q', page: 3, createdAt: timestamp('2026-02-02T00:00:00Z') }] };
  const goals = [{ id: 'g1', type: 'books', target: 12, createdAt: timestamp('2026-01-01T00:00:00Z') }];

  it('nests notes and quotes in their books, oldest first, with counts', () => {
    const data = buildExport({ books, notes, quotes, goals, genres: ['מתח'] }, NOW);
    expect(data).toMatchObject({
      app: 'reading-journal',
      version: EXPORT_VERSION,
      exportedAt: '2026-10-24T09:30:00.000Z',
      counts: { books: 2, notes: 2, quotes: 1, goals: 1 },
      settings: { genres: ['מתח'] },
    });
    expect(data.books.map((b) => b.id)).toEqual(['b1', 'b2']);
    expect(data.books[0].notes.map((n) => n.text)).toEqual(['earlier', 'later']);
    expect(data.books[0].quotes).toEqual([]);
    expect(data.books[1].quotes[0]).toEqual({ id: 'q1', text: 'q', page: 3, createdAt: '2026-02-02T00:00:00.000Z' });
  });

  it('keeps the saved covers', () => {
    const data = buildExport({ books, goals: [], genres: [] }, NOW);
    expect(data.books[1].coverData).toBe('data:image/webp;base64,AAA');
  });

  it('is plain JSON that reads back the same', () => {
    const data = buildExport({ books, notes, quotes, goals, genres: [] }, NOW);
    expect(JSON.parse(exportToJson(data))).toEqual(data);
  });
});

describe('file name and size', () => {
  it('names the file by date', () => {
    expect(exportFileName('2026-10-24')).toBe('reading-journal-2026-10-24.json');
  });

  it('formats sizes', () => {
    expect(formatFileSize(200)).toBe('1 KB');
    expect(formatFileSize(35 * 1024)).toBe('35 KB');
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe('2.4 MB');
  });
});
