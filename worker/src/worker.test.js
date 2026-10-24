// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { handleRequest } from './index.js';
import { isAllowedCoverUrl } from './cover.js';
import { normalizeNliResponse } from './nli.js';
import { isAllowedOrigin, parseAllowedOrigins } from './origin.js';
import { normalizeTavilyResponse } from './providers/tavily.js';
import { signUrl, verifyUrl } from './signing.js';

const APP = 'https://morrevah10.github.io';
const env = {
  ALLOWED_ORIGINS: `${APP},http://localhost:*,http://127.0.0.1:*`,
  NLI_API_KEY: 'nli-secret',
  TAVILY_API_KEY: 'tvly-secret',
  COVER_SIGNING_KEY: 'signing-secret',
};

function request(path, { origin = APP, method = 'GET' } = {}) {
  return new Request(`https://bridge.test${path}`, {
    method,
    headers: origin ? { Origin: origin } : {},
  });
}

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

describe('origin check', () => {
  const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);

  it('allows the app and localhost on any port', () => {
    expect(isAllowedOrigin(APP, allowed)).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173', allowed)).toBe(true);
    expect(isAllowedOrigin('http://localhost:4173', allowed)).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:5173', allowed)).toBe(true);
  });

  it('rejects other origins and look-alikes', () => {
    for (const origin of [
      'https://evil.example',
      'https://morrevah10.github.io.evil.example',
      'http://morrevah10.github.io',
      'https://localhost:5173',
      'http://localhost.evil.example:5173',
      'null',
      '',
      null,
    ]) {
      expect(isAllowedOrigin(origin, allowed), String(origin)).toBe(false);
    }
  });

  it('answers 403 without an allowed Origin, and nothing else runs', async () => {
    const fetchImpl = vi.fn();
    for (const origin of [null, 'https://evil.example']) {
      const response = await handleRequest(request('/nli?q=dune', { origin }), env, { fetchImpl });
      expect(response.status).toBe(403);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('answers the CORS preflight for allowed origins', async () => {
    const response = await handleRequest(request('/cover', { method: 'OPTIONS' }), env);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(APP);
  });

  it('rejects other methods and unknown paths', async () => {
    expect((await handleRequest(request('/nli', { method: 'POST' }), env)).status).toBe(405);
    expect((await handleRequest(request('/secret'), env)).status).toBe(404);
  });
});

describe('/cover', () => {
  const google = 'https://books.google.com/books/content?id=x&printsec=frontcover&img=1';

  it('only lists https URLs on the Google Books hosts', () => {
    expect(isAllowedCoverUrl(google)).toBe(true);
    expect(isAllowedCoverUrl('https://books.googleusercontent.com/abc')).toBe(true);
    expect(isAllowedCoverUrl('http://books.google.com/x')).toBe(false);
    expect(isAllowedCoverUrl('https://evil.example/x.jpg')).toBe(false);
    expect(isAllowedCoverUrl('https://books.google.com.evil.example/x')).toBe(false);
    expect(isAllowedCoverUrl('not a url')).toBe(false);
  });

  it('returns the image with CORS headers', async () => {
    const fetchImpl = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } }));
    const response = await handleRequest(request(`/cover?url=${encodeURIComponent(google)}`), env, { fetchImpl });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(APP);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(fetchImpl.mock.calls[0][0]).toBe(google);
    // An identifying User-Agent, which sites such as Wikimedia require.
    expect(fetchImpl.mock.calls[0][1].headers['User-Agent']).toMatch(/^reading-journal-bridge\//);
  });

  it('refuses other hosts without fetching them', async () => {
    const fetchImpl = vi.fn();
    const response = await handleRequest(
      request(`/cover?url=${encodeURIComponent('https://evil.example/x.jpg')}`),
      env,
      { fetchImpl },
    );
    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('downloads other hosts only with a valid signature from /images', async () => {
    const shop = 'https://shop.example/cover.jpg';
    const image = () => new Response(new Uint8Array([9]), { headers: { 'Content-Type': 'image/png' } });
    const sig = await signUrl(shop, env.COVER_SIGNING_KEY);
    const path = (s) => `/cover?url=${encodeURIComponent(shop)}${s ? `&sig=${s}` : ''}`;

    const fetchImpl = vi.fn(async () => image());
    expect((await handleRequest(request(path(sig)), env, { fetchImpl })).status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    for (const bad of [null, 'forged', await signUrl('https://shop.example/other.jpg', env.COVER_SIGNING_KEY)]) {
      const fetchBad = vi.fn(async () => image());
      expect((await handleRequest(request(path(bad)), env, { fetchImpl: fetchBad })).status).toBe(400);
      expect(fetchBad).not.toHaveBeenCalled();
    }
    // A signature made with another key is rejected too.
    const otherKey = await signUrl(shop, 'other-key');
    expect((await handleRequest(request(path(otherKey)), env, { fetchImpl })).status).toBe(400);
  });

  it('refuses responses that are not images or are too large', async () => {
    const html = vi.fn(async () => new Response('<html>', { headers: { 'Content-Type': 'text/html' } }));
    expect((await handleRequest(request(`/cover?url=${encodeURIComponent(google)}`), env, { fetchImpl: html })).status).toBe(415);

    const huge = vi.fn(async () =>
      new Response('x', { headers: { 'Content-Type': 'image/png', 'Content-Length': String(6 * 1024 * 1024) } }),
    );
    expect((await handleRequest(request(`/cover?url=${encodeURIComponent(google)}`), env, { fetchImpl: huge })).status).toBe(413);
  });

  it('reports a missing upstream image as 404', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 404 }));
    const response = await handleRequest(request(`/cover?url=${encodeURIComponent(google)}`), env, { fetchImpl });
    expect(response.status).toBe(404);
  });
});

describe('/nli', () => {
  // Trimmed from real API responses (24/10/2026).
  const DC = 'http://purl.org/dc/elements/1.1/';
  const record = (fields) =>
    Object.fromEntries(Object.entries(fields).map(([k, v]) => [`${DC}${k}`, [].concat(v).map((x) => ({ '@value': x }))]));
  const sample = [
    record({
      title: 'סיפור על אהבה וחושך / עמוס עוז.',
      creator: 'עוז, עמוס, 1939-2018$$Qעוז, עמוס, 1939-2018',
      date: '20020101',
      identifier: 'NNL_ALEPH21270051200005171',
      format: '593 עמודים ; 21 ס"מ.',
      type: 'book',
      isbn: '9650710744',
      recordid: '990022126970205171',
    }),
    record({
      title: 'הארי פוטר וגביע האש / ג\'י. קי. רולינג ; מאנגלית - גילי בר הלל.',
      creator: "רולינג, ג'יי. קיי., 1965-$$Qרולינג, ג'יי. קיי., 1965-",
      date: '20010101',
      format: '660, [2] עמודים : איורים ; 22 ס"מ.',
      type: 'book',
      recordid: '990021152630205171',
    }),
    record({
      title: 'Harry Potter and the Chamber of Secrets / J.K. Rowling.',
      creator: 'J. K. Rowling$$QRowling, J. K',
      date: '19980101',
      format: '251 pages ; 20 cm.',
      type: 'book',
      isbn: '0-7475-3849-2',
      recordid: '990020463320205171',
    }),
    record({ title: 'תצלומים - סיפור על אהבה וחושך.', type: 'archive', recordid: '1' }),
    record({ title: 'סיפור על אהבה וחושך / עמוס עוז; קריינות', type: 'audio', recordid: '2' }),
    record({ creator: 'no title', type: 'book' }),
  ];

  it('normalizes book records and drops archive items and recordings', () => {
    expect(normalizeNliResponse(sample)).toEqual([
      { nliId: '990022126970205171', title: 'סיפור על אהבה וחושך', author: 'עוז, עמוס', year: 2002, pages: 593, isbn: '9650710744' },
      { nliId: '990021152630205171', title: 'הארי פוטר וגביע האש', author: "רולינג, ג'יי. קיי", year: 2001, pages: 660, isbn: null },
      { nliId: '990020463320205171', title: 'Harry Potter and the Chamber of Secrets', author: 'J. K. Rowling', year: 1998, pages: 251, isbn: '0747538492' },
    ]);
    expect(normalizeNliResponse(null)).toEqual([]);
  });

  it('retries when the API answers 502', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('<html>', { status: 502 }))
      .mockResolvedValueOnce(jsonResponse(sample));
    const response = await handleRequest(request('/nli?q=dune'), env, { fetchImpl });
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('adds the key on the server and never returns it', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(sample));
    const response = await handleRequest(request('/nli?q=%D7%93%D7%99%D7%95%D7%A0%D7%94'), env, { fetchImpl });
    expect(response.status).toBe(200);
    const upstreamUrl = new URL(fetchImpl.mock.calls[0][0]);
    expect(upstreamUrl.origin + upstreamUrl.pathname).toBe('https://api.nli.org.il/openlibrary/search');
    expect(upstreamUrl.searchParams.get('api_key')).toBe('nli-secret');
    expect(upstreamUrl.searchParams.get('query')).toBe('any,contains,דיונה');
    expect(upstreamUrl.searchParams.get('material_type')).toBe('books');
    const text = await response.text();
    expect(text).not.toContain('nli-secret');
    expect(JSON.parse(text).results[0].title).toBe('סיפור על אהבה וחושך');
  });

  it('skips the upstream call for short queries and reports missing configuration', async () => {
    const fetchImpl = vi.fn();
    const short = await handleRequest(request('/nli?q=a'), env, { fetchImpl });
    expect(await short.json()).toEqual({ results: [] });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect((await handleRequest(request('/nli?q=dune'), { ...env, NLI_API_KEY: '' })).status).toBe(503);
  });

  it('gives up with 502 after three failed attempts', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 502 }));
    expect((await handleRequest(request('/nli?q=dune'), env, { fetchImpl })).status).toBe(502);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe('signing', () => {
  it('verifies only the same URL with the same key', async () => {
    const sig = await signUrl('https://a.example/x.jpg', 'k');
    expect(sig).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await verifyUrl('https://a.example/x.jpg', sig, 'k')).toBe(true);
    expect(await verifyUrl('https://a.example/y.jpg', sig, 'k')).toBe(false);
    expect(await verifyUrl('https://a.example/x.jpg', sig, 'other')).toBe(false);
    expect(await verifyUrl('https://a.example/x.jpg', '', 'k')).toBe(false);
    expect(await verifyUrl('https://a.example/x.jpg', sig, '')).toBe(false);
  });
});

describe('/images (Tavily)', () => {
  const tavily = {
    query: 'dune cover',
    images: [
      'https://shop.example/cover-0.jpg',
      { url: 'https://shop.example/cover-1.jpg', description: 'Dune' },
      'http://insecure.example/x.jpg',
      'https://shop.example/cover-0.jpg',
    ],
    results: [
      {
        title: 'Dune — shop',
        url: 'https://shop.example/dune',
        images: Array.from({ length: 6 }, (_, i) => `https://shop.example/r-${i}.jpg`),
      },
      { title: 'no images', url: 'https://x.example' },
    ],
  };

  it('skips site graphics and duplicates that differ only in tracking parameters', () => {
    const images = normalizeTavilyResponse({
      images: [
        'https://upload.wikimedia.org/a/Cover.jpg?utm_source=tavily',
        'https://upload.wikimedia.org/a/Cover.jpg?utm_source=other&utm_medium=x',
        'https://m.media-amazon.com/images/G/01/gno/sprites/nav-sprite-global.png',
        'https://shop.example/static/logo.png',
        'https://shop.example/cover.jpg?width=600',
      ],
    });
    expect(images.map((i) => i.imageUrl)).toEqual([
      'https://upload.wikimedia.org/a/Cover.jpg?utm_source=tavily',
      'https://shop.example/cover.jpg?width=600',
    ]);
  });

  it('collects https images from the top-level list and the results, without duplicates', () => {
    const images = normalizeTavilyResponse(tavily);
    expect(images.map((i) => i.imageUrl)).toEqual([
      'https://shop.example/cover-0.jpg',
      'https://shop.example/cover-1.jpg',
      ...Array.from({ length: 6 }, (_, i) => `https://shop.example/r-${i}.jpg`),
    ]);
    expect(images[2]).toEqual({
      imageUrl: 'https://shop.example/r-0.jpg',
      pageUrl: 'https://shop.example/dune',
      title: 'Dune — shop',
    });
    expect(normalizeTavilyResponse(null)).toEqual([]);
  });

  it('posts the query with a bearer key, returns at most 12 signed images and never the key', async () => {
    const many = {
      ...tavily,
      results: [{ ...tavily.results[0], images: Array.from({ length: 15 }, (_, i) => `https://shop.example/r-${i}.jpg`) }],
    };
    const fetchImpl = vi.fn(async () => jsonResponse(many));
    const response = await handleRequest(request('/images?q=dune%20cover'), env, { fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.tavily.com/search');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tvly-secret');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ query: 'dune cover', include_images: true, search_depth: 'basic' });
    // English queries are not steered to Israeli sites.
    expect(body.include_domains).toBeUndefined();
    expect(body.country).toBeUndefined();

    const text = await response.text();
    expect(text).not.toContain('tvly-secret');
    expect(text).not.toContain('signing-secret');
    const { results } = JSON.parse(text);
    expect(results).toHaveLength(12);
    expect(await verifyUrl(results[0].imageUrl, results[0].sig, env.COVER_SIGNING_KEY)).toBe(true);
  });

  it('prefers Israeli book sites for Hebrew queries, without excluding the rest of the web', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        images: ['https://upload.wikimedia.org/dune.jpg'],
        results: [
          { url: 'https://shop.example/dune', images: ['https://shop.example/dune.jpg'] },
          { url: 'https://www.publisher.co.il/dune', images: ['https://cdn.example/il.jpg'] },
          { url: 'https://www.steimatzky.co.il/dune', images: ['https://cdn.example/steimatzky.jpg'] },
        ],
      }),
    );
    const q = encodeURIComponent('כריכה "דיונה" פרנק הרברט');
    const { results } = await (await handleRequest(request(`/images?q=${q}`), env, { fetchImpl })).json();

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.include_domains).toContain('steimatzky.co.il');
    expect(body.include_domains_mode).toBe('prefer');
    expect(body.country).toBe('israel');
    expect(results.map((r) => r.imageUrl)).toEqual([
      'https://cdn.example/steimatzky.jpg',
      'https://cdn.example/il.jpg',
      'https://upload.wikimedia.org/dune.jpg',
      'https://shop.example/dune.jpg',
    ]);
  });

  it('reports missing configuration and rate limiting', async () => {
    expect((await handleRequest(request('/images?q=dune'), { ...env, TAVILY_API_KEY: '' })).status).toBe(503);
    expect((await handleRequest(request('/images?q=dune'), { ...env, COVER_SIGNING_KEY: '' })).status).toBe(503);
    for (const status of [429, 432]) {
      const fetchImpl = vi.fn(async () => new Response('', { status }));
      expect((await handleRequest(request('/images?q=dune'), env, { fetchImpl })).status).toBe(429);
    }
  });
});
