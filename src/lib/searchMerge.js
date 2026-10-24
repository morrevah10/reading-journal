import { toIsbn13 } from './isbn';

// Merges search results from Google Books and the National Library of Israel.
// A result: { source, id, title, author, pages, thumbnailUrl, isbn, year? }.
// The merged result keeps a `sources` list and fills missing fields from the other source.

const HEBREW_LETTER = /[א-ת]/;
const NIQQUD = /[֑-ׇ]/g;
const FILLABLE = ['author', 'pages', 'thumbnailUrl', 'isbn', 'year'];

export function isHebrew(text) {
  return HEBREW_LETTER.test(text ?? '');
}

// Lower case, no niqqud or punctuation, single spaces.
export function textKey(text) {
  return (text ?? '')
    .toLowerCase()
    .replace(NIQQUD, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function authorTokens(author) {
  return new Set(textKey(author).split(' ').filter((token) => token.length > 1));
}

// Same ISBN, or same title with authors that share a name (or one author unknown).
export function sameBook(a, b) {
  const isbnA = toIsbn13(a.isbn);
  const isbnB = toIsbn13(b.isbn);
  if (isbnA && isbnB) return isbnA === isbnB;
  if (!textKey(a.title) || textKey(a.title) !== textKey(b.title)) return false;
  if (!a.author || !b.author) return true;
  const tokensB = authorTokens(b.author);
  return [...authorTokens(a.author)].some((token) => tokensB.has(token));
}

// Hebrew queries list the National Library first, others Google first.
export function mergeResults(googleResults, nliResults, query) {
  const ordered = isHebrew(query)
    ? [...nliResults, ...googleResults]
    : [...googleResults, ...nliResults];

  const merged = [];
  for (const result of ordered) {
    const match = merged.find((existing) => sameBook(existing, result));
    if (!match) {
      merged.push({ ...result, sources: [result.source] });
      continue;
    }
    for (const field of FILLABLE) {
      if (match[field] == null && result[field] != null) match[field] = result[field];
    }
    if (!match.sources.includes(result.source)) match.sources.push(result.source);
  }
  return merged;
}
