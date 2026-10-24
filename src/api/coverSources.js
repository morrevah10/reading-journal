import { bridgeFetch, bridgeResults, isBridgeConfigured } from './bridge';
import { searchBooks } from './googleBooks';
import { compressImageFile } from '../lib/coverImage';
import { isHebrew } from '../lib/searchMerge';
import { cleanIsbn } from '../lib/isbn';

// Where covers come from, and how they are downloaded for compression into coverData.
// Open Library sends CORS headers and is fetched directly; everything else (Google Books,
// image search results) goes through the Worker's /cover endpoint. Image search results
// carry a signature (`sig`) from the Worker, without which /cover refuses other sites.

const OPEN_LIBRARY_COVERS = 'https://covers.openlibrary.org';
const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json';
const GOOGLE_COVER_HOSTS = ['books.google.com', 'books.googleusercontent.com'];

export const COVER_CANDIDATE_SOURCES = { GOOGLE: 'google', OPEN_LIBRARY: 'openlibrary', WEB: 'web' };

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function isDirectCoverUrl(url) {
  return url?.startsWith(`${OPEN_LIBRARY_COVERS}/`) ?? false;
}

// Google thumbnails are 128px wide by default; fife asks for a sharp ~480×720 copy.
export function googleCoverDownloadUrl(url) {
  if (!url || !GOOGLE_COVER_HOSTS.includes(hostOf(url))) return url;
  return url.includes('fife=') ? url : `${url}&fife=w480-h720`;
}

// default=false makes Open Library answer 404 instead of a blank image when it has no cover.
export function openLibraryIsbnCoverUrl(isbn, size = 'L') {
  const clean = cleanIsbn(isbn);
  return clean ? `${OPEN_LIBRARY_COVERS}/b/isbn/${clean}-${size}.jpg?default=false` : null;
}

export function openLibraryIdCoverUrl(coverId, size) {
  return `${OPEN_LIBRARY_COVERS}/b/id/${coverId}-${size}.jpg?default=false`;
}

// True when the URL can be downloaded in this setup (Worker URLs need VITE_BRIDGE_URL).
export function canDownloadCover(url, bridgeConfigured = isBridgeConfigured()) {
  return Boolean(url) && (isDirectCoverUrl(url) || bridgeConfigured);
}

export async function downloadCover(url, { sig, signal, fetchImpl = globalThis.fetch } = {}) {
  const response = isDirectCoverUrl(url)
    ? await fetchImpl(url, { signal })
    : await bridgeFetch('/cover', sig ? { url, sig } : { url }, { signal, fetchImpl });
  if (!response.ok) throw new Error(`Cover download failed with status ${response.status}`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Cover download is not an image');
  return blob;
}

// Downloads and compresses a cover into a data URL for coverData.
export async function loadCoverData(url, options) {
  return compressImageFile(await downloadCover(url, options));
}

// Query for the image search, with the exact title in quotes:
// 'כריכה "דיונה" פרנק הרברט' / '"Dune" Frank Herbert book cover'.
export function coverSearchQuery(title, author) {
  const exactTitle = `"${title.replace(/["״]/g, '').trim()}"`;
  const words = [exactTitle, author?.trim()].filter(Boolean).join(' ');
  return isHebrew(title) ? `כריכה ${words}` : `${words} book cover`;
}

// A candidate: { key, source, previewUrl, downloadUrl, sig? }.

// Covers of other editions of the same book, from Google Books and Open Library.
export async function editionCoverCandidates({ title, author }, { signal, fetchImpl = globalThis.fetch } = {}) {
  if (!title?.trim()) return [];
  const googleQuery = `intitle:${title.trim()}${author ? ` inauthor:${author.trim()}` : ''}`;
  const olParams = new URLSearchParams({ title: title.trim(), fields: 'cover_i', limit: '10' });
  if (author) olParams.set('author', author.trim());

  const [google, openLibrary] = await Promise.allSettled([
    searchBooks(googleQuery, { signal, maxResults: 20 }),
    fetchImpl(`${OPEN_LIBRARY_SEARCH}?${olParams}`, { signal }).then((response) =>
      response.ok ? response.json() : { docs: [] },
    ),
  ]);

  const candidates = [];
  if (openLibrary.status === 'fulfilled') {
    for (const doc of openLibrary.value.docs ?? []) {
      if (!doc.cover_i) continue;
      candidates.push({
        key: `ol:${doc.cover_i}`,
        source: COVER_CANDIDATE_SOURCES.OPEN_LIBRARY,
        previewUrl: openLibraryIdCoverUrl(doc.cover_i, 'M'),
        downloadUrl: openLibraryIdCoverUrl(doc.cover_i, 'L'),
      });
    }
  }
  if (google.status === 'fulfilled') {
    for (const book of google.value) {
      if (!book.thumbnailUrl) continue;
      candidates.push({
        key: `google:${book.googleId}`,
        source: COVER_CANDIDATE_SOURCES.GOOGLE,
        previewUrl: book.thumbnailUrl,
        downloadUrl: googleCoverDownloadUrl(book.thumbnailUrl),
      });
    }
  }
  return dedupe(candidates);
}

// Cover images from the web, through the Worker's image search.
export async function webCoverCandidates({ title, author }, options = {}) {
  if (!title?.trim()) return [];
  const results = await bridgeResults('/images', { q: coverSearchQuery(title, author) }, options);
  return results
    .filter((result) => result.imageUrl && result.sig)
    .map((result) => ({
      key: `web:${result.imageUrl}`,
      source: COVER_CANDIDATE_SOURCES.WEB,
      previewUrl: result.imageUrl,
      downloadUrl: result.imageUrl,
      sig: result.sig,
    }));
}

function dedupe(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.downloadUrl)) return false;
    seen.add(candidate.downloadUrl);
    return true;
  });
}
