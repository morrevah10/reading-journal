import { firstWorkingCover } from './coverPipeline';

// "שמור את כל הכריכות אצלי": saves a compressed copy (coverData) for books that only have a
// cover link, or that have no cover but an ISBN (tried in Open Library).

export const BACKFILL_CONCURRENCY = 2;

export function booksNeedingCovers(books) {
  return books.filter((book) => !book.coverData && (book.coverUrl || book.isbn));
}

// URLs to try for one book, best first. Same helpers as automaticCoverUrls().
export function backfillUrls(book, { toDownloadUrl, isbnUrl, canDownload }) {
  const urls = [];
  if (book.coverUrl) urls.push(toDownloadUrl(book.coverUrl));
  if (book.isbn) urls.push(isbnUrl(book.isbn));
  return urls.filter((url) => url && canDownload(url));
}

// Processes the books a few at a time. `load(url)` → coverData; `save(book, coverData)`.
// `shouldStop()` is checked before each book. `onProgress({ done, total, saved, failed })`.
// Returns { saved, failed, stopped } where `failed` lists the books that got no cover.
export async function runBackfill(
  books,
  { urlsFor, load, save, shouldStop = () => false, onProgress = () => {}, concurrency = BACKFILL_CONCURRENCY },
) {
  const queue = [...books];
  const failed = [];
  let saved = 0;
  let done = 0;
  let stopped = false;

  async function worker() {
    while (queue.length) {
      if (shouldStop()) {
        stopped = true;
        return;
      }
      const book = queue.shift();
      const found = await firstWorkingCover(urlsFor(book), load);
      if (found) {
        try {
          await save(book, found.coverData);
          saved += 1;
        } catch {
          failed.push(book);
        }
      } else {
        failed.push(book);
      }
      done += 1;
      onProgress({ done, total: books.length, saved, failed: failed.length });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, books.length) }, worker));
  return { saved, failed, stopped };
}
