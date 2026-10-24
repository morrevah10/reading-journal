import { afterEach, describe, expect, it, vi } from 'vitest';
import { BridgeError, bridgeBaseUrl, bridgeFetch, bridgeResults, bridgeUrl } from './bridge';
import { searchAllSources } from './bookSearch';
import {
  canDownloadCover,
  coverSearchQuery,
  downloadCover,
  editionCoverCandidates,
  googleCoverDownloadUrl,
  openLibraryIsbnCoverUrl,
  webCoverCandidates,
} from './coverSources';
import { searchBooks } from './googleBooks';
import { normalizeNliResult, searchNli } from './nli';

vi.mock('./googleBooks', () => ({ searchBooks: vi.fn() }));

const BASE = 'https://bridge.test';
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('bridge client', () => {
  it('builds URLs from VITE_BRIDGE_URL, without a trailing slash', () => {
    expect(bridgeBaseUrl('https://b.test/')).toBe('https://b.test');
    expect(bridgeBaseUrl('')).toBeNull();
    expect(bridgeUrl('/nli', { q: 'דיונה' }, BASE)).toBe(`${BASE}/nli?q=%D7%93%D7%99%D7%95%D7%A0%D7%94`);
    expect(bridgeUrl('/nli', { q: 'x' }, null)).toBeNull();
  });

  it('fails cleanly when the Worker is not configured', async () => {
    await expect(bridgeFetch('/nli', { q: 'x' }, { base: null, fetchImpl: vi.fn() })).rejects.toMatchObject({
      code: 'not-configured',
    });
  });

  it('passes on the Worker error code', async () => {
    const fetchImpl = vi.fn(async () => json({ error: 'rate-limited' }, 429));
    const error = await bridgeFetch('/images', { q: 'x' }, { base: BASE, fetchImpl }).catch((e) => e);
    expect(error).toBeInstanceOf(BridgeError);
    expect(error).toMatchObject({ status: 429, code: 'rate-limited' });
  });

  it('returns the results list', async () => {
    const fetchImpl = vi.fn(async () => json({ results: [{ a: 1 }] }));
    expect(await bridgeResults('/nli', { q: 'x' }, { base: BASE, fetchImpl })).toEqual([{ a: 1 }]);
  });
});

describe('searchNli', () => {
  it('maps Worker results to the common result shape', async () => {
    vi.stubEnv('VITE_BRIDGE_URL', BASE);
    const fetchImpl = vi.fn(async () =>
      json({ results: [{ nliId: '99', title: 'דיונה', author: 'הרברט, פרנק', year: 2019, isbn: '9789650723456' }, { title: '' }] }),
    );
    expect(await searchNli('דיונה', { fetchImpl })).toEqual([
      normalizeNliResult({ nliId: '99', title: 'דיונה', author: 'הרברט, פרנק', year: 2019, isbn: '9789650723456' }),
    ]);
    expect(fetchImpl.mock.calls[0][0]).toBe(`${BASE}/nli?q=%D7%93%D7%99%D7%95%D7%A0%D7%94`);
  });
});

describe('searchAllSources', () => {
  const g = { source: 'google', id: 'google:1', title: 'Dune', author: 'Frank Herbert' };

  it('searches only Google when the Worker is not configured', async () => {
    searchBooks.mockResolvedValue([g]);
    const { results, failed } = await searchAllSources('dune', { bridgeConfigured: false });
    expect(results).toEqual([{ ...g, sources: ['google'] }]);
    expect(failed).toEqual([]);
  });

  it('keeps the results of one source when the other fails', async () => {
    vi.stubEnv('VITE_BRIDGE_URL', BASE);
    searchBooks.mockResolvedValue([g]);
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'upstream-error' }, 502)));
    const { results, failed } = await searchAllSources('dune', { bridgeConfigured: true });
    expect(results).toHaveLength(1);
    expect(failed).toEqual(['nli']);
    vi.unstubAllGlobals();
  });

  it('throws when every source fails', async () => {
    searchBooks.mockRejectedValue(new Error('429'));
    await expect(searchAllSources('dune', { bridgeConfigured: false })).rejects.toThrow();
  });
});

describe('cover sources', () => {
  it('upgrades Google thumbnails and builds Open Library URLs', () => {
    const thumb = 'https://books.google.com/books/content?id=x&zoom=1';
    expect(googleCoverDownloadUrl(thumb)).toBe(`${thumb}&fife=w480-h720`);
    expect(googleCoverDownloadUrl(`${thumb}&fife=w100`)).toBe(`${thumb}&fife=w100`);
    expect(googleCoverDownloadUrl('https://other.example/a.jpg')).toBe('https://other.example/a.jpg');
    expect(openLibraryIsbnCoverUrl('978-0-441-01359-3')).toBe(
      'https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg?default=false',
    );
    expect(openLibraryIsbnCoverUrl('bad')).toBeNull();
  });

  it('knows which URLs need the Worker', () => {
    expect(canDownloadCover('https://covers.openlibrary.org/b/id/1-L.jpg', false)).toBe(true);
    expect(canDownloadCover('https://books.google.com/x', false)).toBe(false);
    expect(canDownloadCover('https://books.google.com/x', true)).toBe(true);
    expect(canDownloadCover(null, true)).toBe(false);
  });

  it('builds the image search query with the exact title, in the language of the title', () => {
    expect(coverSearchQuery('דיונה', 'פרנק הרברט')).toBe('כריכה "דיונה" פרנק הרברט');
    expect(coverSearchQuery('Dune', null)).toBe('"Dune" book cover');
    // Quotes inside the title would break the exact phrase.
    expect(coverSearchQuery('ספר "הכל"', null)).toBe('כריכה "ספר הכל"');
  });

  it('downloads Open Library directly and other covers through the Worker', async () => {
    vi.stubEnv('VITE_BRIDGE_URL', BASE);
    const image = () => new Response(new Blob(['x'], { type: 'image/jpeg' }), { headers: { 'Content-Type': 'image/jpeg' } });
    const fetchImpl = vi.fn(async () => image());

    await downloadCover('https://covers.openlibrary.org/b/id/1-L.jpg', { fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://covers.openlibrary.org/b/id/1-L.jpg');

    const blob = await downloadCover('https://books.google.com/x?id=1', { fetchImpl });
    expect(fetchImpl.mock.calls[1][0]).toBe(`${BASE}/cover?url=${encodeURIComponent('https://books.google.com/x?id=1')}`);
    expect(blob.type).toBe('image/jpeg');
  });

  it('rejects downloads that are not images', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>', { headers: { 'Content-Type': 'text/html' } }));
    await expect(downloadCover('https://covers.openlibrary.org/b/id/1-L.jpg', { fetchImpl })).rejects.toThrow();
  });

  it('collects covers of other editions from Open Library and Google', async () => {
    searchBooks.mockResolvedValue([
      { googleId: 'g1', thumbnailUrl: 'https://books.google.com/books/content?id=g1' },
      { googleId: 'g2', thumbnailUrl: null },
    ]);
    const fetchImpl = vi.fn(async () => json({ docs: [{ cover_i: 11 }, {}, { cover_i: 11 }] }));
    const candidates = await editionCoverCandidates({ title: 'Dune', author: 'Herbert' }, { fetchImpl });
    expect(candidates.map((c) => c.key)).toEqual(['ol:11', 'google:g1']);
    expect(candidates[1].downloadUrl).toContain('fife=w480-h720');
    expect(searchBooks.mock.calls[0][0]).toBe('intitle:Dune inauthor:Herbert');
    const olUrl = new URL(fetchImpl.mock.calls[0][0]);
    expect(olUrl.searchParams.get('title')).toBe('Dune');
    expect(olUrl.searchParams.get('author')).toBe('Herbert');
  });

  it('turns signed image search results into candidates', async () => {
    vi.stubEnv('VITE_BRIDGE_URL', BASE);
    const fetchImpl = vi.fn(async () =>
      json({
        results: [
          { imageUrl: 'https://shop.example/1.jpg', sig: 'abc' },
          { imageUrl: 'https://shop.example/unsigned.jpg' },
        ],
      }),
    );
    const candidates = await webCoverCandidates({ title: 'Dune', author: 'Herbert' }, { fetchImpl });
    expect(candidates).toEqual([
      {
        key: 'web:https://shop.example/1.jpg',
        source: 'web',
        previewUrl: 'https://shop.example/1.jpg',
        downloadUrl: 'https://shop.example/1.jpg',
        sig: 'abc',
      },
    ]);
    expect(new URL(fetchImpl.mock.calls[0][0]).searchParams.get('q')).toBe('"Dune" Herbert book cover');
  });

  it('passes the signature to /cover', async () => {
    vi.stubEnv('VITE_BRIDGE_URL', BASE);
    const fetchImpl = vi.fn(async () => new Response(new Blob(['x'], { type: 'image/png' }), { headers: { 'Content-Type': 'image/png' } }));
    await downloadCover('https://shop.example/1.jpg', { sig: 'abc', fetchImpl });
    const url = new URL(fetchImpl.mock.calls[0][0]);
    expect(url.pathname).toBe('/cover');
    expect(url.searchParams.get('url')).toBe('https://shop.example/1.jpg');
    expect(url.searchParams.get('sig')).toBe('abc');
  });
});
