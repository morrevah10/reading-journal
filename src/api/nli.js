import { bridgeResults } from './bridge';

// National Library of Israel search through the Worker, which holds the API key.
// Returns results in the same shape as Google Books (see googleBooks.js), with source 'nli'.
export async function searchNli(query, options = {}) {
  const q = query?.trim() ?? '';
  if (q.length < 2) return [];
  const results = await bridgeResults('/nli', { q }, options);
  return results.map(normalizeNliResult).filter((book) => book.title);
}

export function normalizeNliResult(item) {
  return {
    source: 'nli',
    id: item?.nliId ? `nli:${item.nliId}` : null,
    title: item?.title?.trim() ?? '',
    author: item?.author ?? null,
    pages: Number.isInteger(item?.pages) && item.pages > 0 ? item.pages : null,
    thumbnailUrl: null,
    isbn: item?.isbn ?? null,
    year: item?.year ?? null,
  };
}
