import { HttpError, fetchUpstream } from './http.js';

// National Library of Israel Open Library search API. The key stays in the Worker.
// https://api.nli.org.il/openlibrary/search?api_key=…&query=any,contains,…&material_type=books&output_format=json
export const NLI_ENDPOINT = 'https://api.nli.org.il/openlibrary/search';
export const NLI_MAX_RESULTS = 10;
// The API answers 502 now and then; a retry usually succeeds.
export const NLI_ATTEMPTS = 3;

const BOOK_TYPES = ['book', 'ebook'];

export function buildNliUrl(query, apiKey) {
  const params = new URLSearchParams({
    api_key: apiKey,
    query: `any,contains,${query}`,
    material_type: 'books',
    output_format: 'json',
  });
  return `${NLI_ENDPOINT}?${params}`;
}

export async function handleNli(params, env, { fetchImpl = fetch } = {}) {
  const q = params.get('q')?.trim() ?? '';
  if (q.length < 2) return [];
  if (!env.NLI_API_KEY) throw new HttpError(503, 'not-configured');

  let upstream;
  for (let attempt = 1; attempt <= NLI_ATTEMPTS; attempt += 1) {
    upstream = await fetchUpstream(fetchImpl, buildNliUrl(q, env.NLI_API_KEY), {
      headers: { Accept: 'application/json' },
    });
    if (upstream.status < 500) break;
  }
  if (!upstream.ok) {
    // Logged for `wrangler tail`; never the URL, which contains the key.
    const body = await upstream.text().catch(() => '');
    console.error('NLI failed', upstream.status, upstream.headers.get('Server'), body.slice(0, 300));
    throw new HttpError(502, 'upstream-error');
  }
  return normalizeNliResponse(await upstream.json()).slice(0, NLI_MAX_RESULTS);
}

// The response is a list of Dublin Core records (JSON-LD): keys are full URIs such as
// "http://purl.org/dc/elements/1.1/title", values are lists of { "@value": … }.
// Archive items, recordings etc. are dropped; only books are returned.
export function normalizeNliResponse(data) {
  const records = Array.isArray(data) ? data : [];
  return records
    .filter((record) => {
      const types = all(record, 'type');
      return types.length === 0 || types.some((type) => BOOK_TYPES.includes(type.toLowerCase()));
    })
    .map((record) => {
      const title = cleanTitle(first(record, 'title'));
      if (!title) return null;
      return {
        nliId: first(record, 'recordid'),
        title,
        author: cleanAuthor(first(record, 'creator')),
        year: pickYear(first(record, 'date')),
        pages: pickPages(first(record, 'format')),
        isbn: pickIsbn([...all(record, 'isbn'), ...all(record, 'identifier')]),
      };
    })
    .filter(Boolean);
}

const DC = 'http://purl.org/dc/elements/1.1/';

function all(record, field) {
  const raw = record?.[`${DC}${field}`];
  const list = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  return list
    .map((value) => (typeof value === 'object' && value !== null ? value['@value'] : value))
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim());
}

function first(record, field) {
  return all(record, field)[0] ?? null;
}

// "סיפור על אהבה וחושך / עמוס עוז." → "סיפור על אהבה וחושך"
function cleanTitle(value) {
  if (!value) return null;
  return value.split(' / ')[0].replace(/[\s:;,./]+$/, '').trim() || null;
}

// "עוז, עמוס, 1939-2018$$Qעוז, עמוס, 1939-2018" → "עוז, עמוס"
// "J. K. Rowling$$QRowling, J. K" → "J. K. Rowling"
function cleanAuthor(value) {
  if (!value) return null;
  const name = value.split('$$Q')[0];
  return name.replace(/[,\s]*\(?\d{4}-?(\d{4})?\)?\.?$/, '').replace(/[\s,.]+$/, '').trim() || null;
}

// "20020101" → 2002
function pickYear(value) {
  const match = value?.match(/^(1[5-9]|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

// "593 עמודים ; 21 ס"מ." → 593, "660, [2] עמודים : איורים" → 660, "251 pages ; 20 cm." → 251
function pickPages(value) {
  const match = value?.match(/(\d+)(?:\s*,\s*\[\d+\])?\s*(?:עמודים|עמ'|pages|p\.)/);
  const pages = match ? Number(match[1]) : null;
  return pages && pages > 0 ? pages : null;
}

// First ISBN found, hyphens removed. A bare 13-digit 978/979 or a 10-digit value counts;
// longer digit runs (record ids) are never mistaken for one.
function pickIsbn(values) {
  for (const value of values) {
    const compact = value.replace(/[-\s]/g, '');
    const isbn13 = compact.match(/(?<!\d)97[89]\d{10}(?!\d)/);
    if (isbn13) return isbn13[0];
    const isbn10 = compact.match(/(?<![\dA-Z_])\d{9}[\dX](?![\dX])/i);
    if (isbn10) return isbn10[0].toUpperCase();
  }
  return null;
}
