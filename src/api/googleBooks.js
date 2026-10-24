const ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';

export class GoogleBooksError extends Error {
  constructor(status) {
    super(`Google Books request failed with status ${status}`);
    this.status = status;
  }
}

// Searches Google Books and returns normalized results. Queries shorter than 2 chars return [].
export async function searchBooks(
  query,
  {
    signal,
    fetchImpl = globalThis.fetch,
    apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY,
    maxResults = 10,
  } = {},
) {
  const q = query?.trim() ?? '';
  if (q.length < 2) return [];

  const params = new URLSearchParams({ q, maxResults: String(maxResults), printType: 'books' });
  if (apiKey) params.set('key', apiKey);

  const response = await fetchImpl(`${ENDPOINT}?${params}`, { signal });
  if (!response.ok) throw new GoogleBooksError(response.status);
  const data = await response.json();
  return (data.items ?? []).map(normalizeVolume).filter((book) => book.title);
}

export function normalizeVolume(item) {
  const info = item?.volumeInfo ?? {};
  const links = info.imageLinks ?? {};
  return {
    googleId: item?.id ?? null,
    title: info.title?.trim() ?? '',
    author: info.authors?.length ? info.authors.join(', ') : null,
    pages: Number.isInteger(info.pageCount) && info.pageCount > 0 ? info.pageCount : null,
    thumbnailUrl: cleanImageUrl(links.thumbnail || links.smallThumbnail),
    isbn: pickIsbn(info.industryIdentifiers),
  };
}

// Forces https and drops the page-curl effect Google adds to thumbnails.
function cleanImageUrl(url) {
  if (!url) return null;
  return url.replace(/^http:\/\//, 'https://').replace(/&edge=curl/, '');
}

function pickIsbn(identifiers = []) {
  const find = (type) => identifiers.find((id) => id.type === type)?.identifier;
  return find('ISBN_13') ?? find('ISBN_10') ?? null;
}
