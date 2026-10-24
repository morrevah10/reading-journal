import { describe, expect, it, vi } from 'vitest';
import { GoogleBooksError, normalizeVolume, searchBooks } from './googleBooks';

const fullItem = {
  id: 'abc123',
  volumeInfo: {
    title: 'Dune',
    authors: ['Frank Herbert', 'Brian Herbert'],
    pageCount: 412,
    imageLinks: {
      smallThumbnail: 'http://books.google.com/books/content?id=abc123&zoom=5',
      thumbnail: 'http://books.google.com/books/content?id=abc123&zoom=1&edge=curl',
    },
    industryIdentifiers: [
      { type: 'ISBN_10', identifier: '0441013597' },
      { type: 'ISBN_13', identifier: '9780441013593' },
    ],
  },
};

function okResponse(body) {
  return { ok: true, status: 200, json: async () => body };
}

describe('normalizeVolume', () => {
  it('maps a full volume', () => {
    expect(normalizeVolume(fullItem)).toEqual({
      source: 'google',
      id: 'google:abc123',
      googleId: 'abc123',
      title: 'Dune',
      author: 'Frank Herbert, Brian Herbert',
      pages: 412,
      thumbnailUrl: 'https://books.google.com/books/content?id=abc123&zoom=1',
      isbn: '9780441013593',
    });
  });

  it('handles missing fields', () => {
    expect(normalizeVolume({ id: 'x', volumeInfo: { title: 'Only title' } })).toEqual({
      source: 'google',
      id: 'google:x',
      googleId: 'x',
      title: 'Only title',
      author: null,
      pages: null,
      thumbnailUrl: null,
      isbn: null,
    });
  });

  it('falls back to the small thumbnail and ISBN_10', () => {
    const result = normalizeVolume({
      id: 'y',
      volumeInfo: {
        title: 'T',
        pageCount: 0,
        imageLinks: { smallThumbnail: 'http://img' },
        industryIdentifiers: [{ type: 'ISBN_10', identifier: '123' }],
      },
    });
    expect(result).toMatchObject({ thumbnailUrl: 'https://img', isbn: '123', pages: null });
  });
});

describe('searchBooks', () => {
  it('returns [] for short queries without calling the API', async () => {
    const fetchImpl = vi.fn();
    expect(await searchBooks(' a ', { fetchImpl })).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends the query and API key and normalizes results', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ items: [fullItem] }));
    const results = await searchBooks('dune', { fetchImpl, apiKey: 'KEY' });
    const url = new URL(fetchImpl.mock.calls[0][0]);
    expect(url.searchParams.get('q')).toBe('dune');
    expect(url.searchParams.get('key')).toBe('KEY');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Dune');
  });

  it('returns [] when there are no items', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ totalItems: 0 }));
    expect(await searchBooks('zzzz', { fetchImpl, apiKey: 'KEY' })).toEqual([]);
  });

  it('drops results without a title', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ items: [{ id: 'n', volumeInfo: {} }] }));
    expect(await searchBooks('xx', { fetchImpl, apiKey: 'KEY' })).toEqual([]);
  });

  it('throws GoogleBooksError on HTTP errors such as 429', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(searchBooks('dune', { fetchImpl, apiKey: 'KEY' })).rejects.toMatchObject({
      status: 429,
    });
    await expect(searchBooks('dune', { fetchImpl, apiKey: 'KEY' })).rejects.toBeInstanceOf(
      GoogleBooksError,
    );
  });

  it('propagates network errors after one retry', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(searchBooks('dune', { fetchImpl, apiKey: 'KEY', retryDelayMs: 0 })).rejects.toThrow(
      TypeError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries once after a 503', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce(okResponse({ items: [fullItem] }));
    const results = await searchBooks('dune', { fetchImpl, apiKey: 'KEY', retryDelayMs: 0 });
    expect(results).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries once after a network error', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(okResponse({ items: [fullItem] }));
    expect(await searchBooks('dune', { fetchImpl, apiKey: 'KEY', retryDelayMs: 0 })).toHaveLength(1);
  });

  it('gives up after the second 503', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(
      searchBooks('dune', { fetchImpl, apiKey: 'KEY', retryDelayMs: 0 }),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry other errors or an aborted search', async () => {
    const limited = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(searchBooks('dune', { fetchImpl: limited, apiKey: 'KEY' })).rejects.toBeInstanceOf(
      GoogleBooksError,
    );
    expect(limited).toHaveBeenCalledTimes(1);

    const abort = new DOMException('Aborted', 'AbortError');
    const aborted = vi.fn().mockRejectedValue(abort);
    await expect(searchBooks('dune', { fetchImpl: aborted, apiKey: 'KEY' })).rejects.toBe(abort);
    expect(aborted).toHaveBeenCalledTimes(1);
  });
});
