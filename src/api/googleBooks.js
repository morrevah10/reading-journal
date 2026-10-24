const ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';

export class GoogleBooksError extends Error {
  constructor(status) {
    super(`Google Books request failed with status ${status}`);
    this.status = status;
  }
}

export const RETRY_DELAY_MS = 600;

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

// Google Books sometimes answers 503 or drops the connection; such a request is tried once more.
async function fetchWithRetry(url, { signal, fetchImpl, retryDelayMs }) {
  try {
    const response = await fetchImpl(url, { signal });
    if (response.status !== 503) return response;
  } catch (err) {
    if (err?.name === 'AbortError' || signal?.aborted) throw err;
  }
  await wait(retryDelayMs, signal);
  return fetchImpl(url, { signal });
}

// Searches Google Books and returns normalized results. Queries shorter than 2 chars return [].
export async function searchBooks(
  query,
  {
    signal,
    fetchImpl = globalThis.fetch,
    apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY,
    maxResults = 10,
    retryDelayMs = RETRY_DELAY_MS,
  } = {},
) {
  const q = query?.trim() ?? '';
  if (q.length < 2) return [];

  const params = new URLSearchParams({ q, maxResults: String(maxResults), printType: 'books' });
  if (apiKey) params.set('key', apiKey);

  const response = await fetchWithRetry(`${ENDPOINT}?${params}`, { signal, fetchImpl, retryDelayMs });
  if (!response.ok) throw new GoogleBooksError(response.status);
  const data = await response.json();
  return (data.items ?? []).map(normalizeVolume).filter((book) => book.title);
}

export function normalizeVolume(item) {
  const info = item?.volumeInfo ?? {};
  const links = info.imageLinks ?? {};
  return {
    source: 'google',
    id: item?.id ? `google:${item.id}` : null,
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
