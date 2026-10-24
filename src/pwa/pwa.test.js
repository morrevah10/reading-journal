// @vitest-environment node
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BASE_PATH, manifest } from './manifest';
import { COVER_URL_PATTERN, workbox } from './workbox';

const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));

describe('manifest', () => {
  it('is Hebrew, right-to-left and named יומן קריאה', () => {
    expect(manifest).toMatchObject({ lang: 'he', dir: 'rtl', name: 'יומן קריאה', short_name: 'יומן קריאה' });
  });

  it('starts and is scoped under the GitHub Pages base path', () => {
    expect(BASE_PATH).toBe('/reading-journal/');
    expect(manifest.start_url).toBe(BASE_PATH);
    expect(manifest.scope).toBe(BASE_PATH);
    expect(manifest.display).toBe('standalone');
  });

  it('has 192 and 512 icons and a maskable icon', () => {
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  it('every icon file exists in public/', () => {
    const files = [
      ...manifest.icons.map((icon) => icon.src),
      'icon.svg',
      'favicon.ico',
      'apple-touch-icon-180x180.png',
    ];
    for (const file of files) {
      expect(existsSync(publicDir + file), file).toBe(true);
    }
  });
});

describe('service worker caching', () => {
  it('caches Google Books covers', () => {
    expect(COVER_URL_PATTERN.test('https://books.google.com/books/content?id=abc&printsec=frontcover&img=1')).toBe(true);
    expect(COVER_URL_PATTERN.test('https://books.googleusercontent.com/books/content?id=abc')).toBe(true);
  });

  it('never caches the Books API, Firestore or Auth', () => {
    for (const url of [
      'https://www.googleapis.com/books/v1/volumes?q=dune',
      'https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel',
      'https://identitytoolkit.googleapis.com/v1/accounts:lookup',
    ]) {
      expect(COVER_URL_PATTERN.test(url), url).toBe(false);
    }
    expect(workbox.runtimeCaching).toHaveLength(1);
  });

  it('keeps covers as opaque responses with a size and age limit', () => {
    const { options } = workbox.runtimeCaching[0];
    expect(options.cacheableResponse.statuses).toContain(0);
    expect(options.expiration).toMatchObject({ maxEntries: 150, maxAgeSeconds: 60 * 24 * 60 * 60 });
  });
});
