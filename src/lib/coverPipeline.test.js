import { describe, expect, it, vi } from 'vitest';
import {
  PICKER_CANDIDATES,
  automaticCoverUrls,
  firstWorkingCover,
  isCoverShaped,
  pickCandidates,
  pickerView,
} from './coverPipeline';
import { backfillUrls, booksNeedingCovers, runBackfill } from './coverBackfill';

const helpers = {
  toDownloadUrl: (url) => `${url}&big`,
  isbnUrl: (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
  canDownload: () => true,
};

describe('automaticCoverUrls', () => {
  it('tries the result cover first, then Open Library by ISBN', () => {
    expect(automaticCoverUrls({ thumbnailUrl: 'https://g/1?a', isbn: '123' }, helpers)).toEqual([
      'https://g/1?a&big',
      'https://covers.openlibrary.org/b/isbn/123-L.jpg',
    ]);
    expect(automaticCoverUrls({ isbn: '123' }, helpers)).toEqual(['https://covers.openlibrary.org/b/isbn/123-L.jpg']);
    expect(automaticCoverUrls({}, helpers)).toEqual([]);
    expect(automaticCoverUrls(null, helpers)).toEqual([]);
  });

  it('drops URLs this setup can not download', () => {
    const canDownload = (url) => url.includes('openlibrary');
    expect(automaticCoverUrls({ thumbnailUrl: 'https://g/1', isbn: '1' }, { ...helpers, canDownload })).toEqual([
      'https://covers.openlibrary.org/b/isbn/1-L.jpg',
    ]);
  });
});

describe('firstWorkingCover', () => {
  it('returns the first URL that loads', async () => {
    const load = vi.fn(async (url) => {
      if (url === 'a') throw new Error('404');
      return `data:${url}`;
    });
    expect(await firstWorkingCover(['a', 'b', 'c'], load)).toEqual({ coverData: 'data:b', url: 'b' });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('returns null when nothing loads', async () => {
    expect(await firstWorkingCover(['a'], async () => Promise.reject(new Error('x')))).toBeNull();
    expect(await firstWorkingCover([], vi.fn())).toBeNull();
  });
});

describe('pickCandidates', () => {
  const list = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

  it('takes half from each list', () => {
    expect(pickCandidates(list('e', 5), list('w', 5))).toEqual(['e0', 'e1', 'e2', 'w0', 'w1', 'w2']);
  });

  it('fills free slots from the longer list', () => {
    expect(pickCandidates(list('e', 1), list('w', 9))).toEqual(['e0', 'w0', 'w1', 'w2', 'w3', 'w4']);
    expect(pickCandidates(list('e', 9), list('w', 1))).toEqual(['e0', 'e1', 'e2', 'e3', 'e4', 'w0']);
    expect(pickCandidates(list('e', 2), [])).toEqual(['e0', 'e1']);
    expect(pickCandidates([], [])).toEqual([]);
  });

  it('splits 12 candidates for the picker the same way', () => {
    expect(pickCandidates(list('e', 20), list('w', 20), PICKER_CANDIDATES)).toEqual([
      ...list('e', 6),
      ...list('w', 6),
    ]);
  });
});

describe('isCoverShaped', () => {
  it('accepts covers from square to tall', () => {
    expect(isCoverShaped(300, 450)).toBe(true);
    expect(isCoverShaped(1000, 1000)).toBe(true);
    expect(isCoverShaped(128, 180)).toBe(true);
    expect(isCoverShaped(200, 440)).toBe(true);
  });

  it('rejects icons, banners, very narrow strips and unknown sizes', () => {
    expect(isCoverShaped(48, 48)).toBe(false);
    expect(isCoverShaped(99, 150)).toBe(false);
    expect(isCoverShaped(1200, 300)).toBe(false);
    expect(isCoverShaped(400, 300)).toBe(false);
    expect(isCoverShaped(100, 300)).toBe(false);
    expect(isCoverShaped(0, 0)).toBe(false);
    expect(isCoverShaped(undefined, undefined)).toBe(false);
  });
});

describe('pickerView', () => {
  const candidates = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((key) => ({ key }));
  const keys = (view) => view.visible.map((c) => c.key);

  it('shows nothing while images are still loading', () => {
    expect(pickerView(candidates, { loaded: [], failed: [] })).toEqual({ visible: [], allFailed: false });
  });

  it('shows the first 6 images that loaded, in load order, skipping failed ones', () => {
    const view = pickerView(candidates, {
      loaded: ['h', 'b', 'c', 'd', 'e', 'f', 'g'],
      failed: ['a'],
    });
    expect(keys(view)).toEqual(['h', 'b', 'c', 'd', 'e', 'f']);
    expect(view.allFailed).toBe(false);
  });

  it('reports when every image failed', () => {
    const failed = candidates.map((c) => c.key);
    expect(pickerView(candidates, { loaded: [], failed })).toEqual({ visible: [], allFailed: true });
    expect(pickerView([], { loaded: [], failed: [] }).allFailed).toBe(false);
  });
});

describe('cover backfill', () => {
  const books = [
    { id: '1', title: 'Link only', coverUrl: 'https://g/1' },
    { id: '2', title: 'Saved', coverUrl: 'https://g/2', coverData: 'data:x' },
    { id: '3', title: 'ISBN only', isbn: '978' },
    { id: '4', title: 'Nothing' },
  ];

  it('finds books whose cover is not saved yet', () => {
    expect(booksNeedingCovers(books).map((b) => b.id)).toEqual(['1', '3']);
  });

  it('builds URLs from the link and the ISBN', () => {
    expect(backfillUrls({ coverUrl: 'https://g/1?x', isbn: '978' }, helpers)).toEqual([
      'https://g/1?x&big',
      'https://covers.openlibrary.org/b/isbn/978-L.jpg',
    ]);
  });

  it('saves found covers, reports progress and lists failures', async () => {
    const save = vi.fn(async () => {});
    const onProgress = vi.fn();
    const result = await runBackfill(booksNeedingCovers(books), {
      urlsFor: (book) => backfillUrls(book, helpers),
      load: async (url) => {
        if (url.includes('openlibrary')) throw new Error('404');
        return 'data:cover';
      },
      save,
      onProgress,
    });
    expect(save).toHaveBeenCalledWith(books[0], 'data:cover');
    expect(result.saved).toBe(1);
    expect(result.failed.map((b) => b.id)).toEqual(['3']);
    expect(result.stopped).toBe(false);
    expect(onProgress).toHaveBeenLastCalledWith({ done: 2, total: 2, saved: 1, failed: 1 });
  });

  it('counts a failed save as a failure', async () => {
    const result = await runBackfill([books[0]], {
      urlsFor: () => ['u'],
      load: async () => 'data:x',
      save: async () => Promise.reject(new Error('denied')),
    });
    expect(result).toMatchObject({ saved: 0, failed: [books[0]] });
  });

  it('stops before the next book when asked', async () => {
    let stop = false;
    const many = Array.from({ length: 10 }, (_, i) => ({ id: String(i), coverUrl: `u${i}` }));
    const save = vi.fn(async () => {
      stop = true;
    });
    const result = await runBackfill(many, {
      urlsFor: (book) => [book.coverUrl],
      load: async () => 'data:x',
      save,
      shouldStop: () => stop,
      concurrency: 1,
    });
    expect(result.stopped).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
