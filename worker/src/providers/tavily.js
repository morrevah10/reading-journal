// Tavily Search API — the cover image provider (search with include_images; basic = 1 credit).
// To switch providers, add a module with the same two functions and use it in images.js.
// https://docs.tavily.com/documentation/api-reference/endpoint/search
export const TAVILY_SEARCH_ENDPOINT = 'https://api.tavily.com/search';

// `preferDomains` and `country` boost those sites without excluding the rest of the web.
export function buildTavilyRequest(query, apiKey, { preferDomains = [], country = null } = {}) {
  const body = {
    query,
    topic: 'general',
    search_depth: 'basic',
    max_results: 10,
    include_images: true,
    include_answer: false,
  };
  if (preferDomains.length) {
    body.include_domains = preferDomains;
    body.include_domains_mode = 'prefer';
  }
  if (country) body.country = country;
  return {
    url: TAVILY_SEARCH_ENDPOINT,
    init: {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  };
}

// Site graphics that are never book covers.
const NOT_A_COVER = /(sprite|logo|icon|favicon|avatar|banner|placeholder)/i;

// The same image with different tracking parameters (utm_*) counts once.
function dedupeKey(url) {
  const parsed = new URL(url);
  for (const name of [...parsed.searchParams.keys()]) {
    if (name.startsWith('utm_')) parsed.searchParams.delete(name);
  }
  return parsed.toString();
}

// → [{ imageUrl, pageUrl, title }], https only, without duplicates or site graphics.
// Images come as a top-level list and per result; an item is a URL string or { url, description }.
export function normalizeTavilyResponse(data) {
  const seen = new Set();
  const images = [];
  const add = (item, page) => {
    const url = typeof item === 'string' ? item : item?.url;
    if (typeof url !== 'string' || !url.startsWith('https://')) return;
    let key;
    try {
      key = dedupeKey(url);
    } catch {
      return;
    }
    if (seen.has(key) || NOT_A_COVER.test(new URL(url).pathname)) return;
    seen.add(key);
    images.push({
      imageUrl: url,
      pageUrl: typeof page?.url === 'string' ? page.url : null,
      title: typeof page?.title === 'string' ? page.title : null,
    });
  };
  for (const item of data?.images ?? []) add(item, null);
  for (const result of data?.results ?? []) {
    for (const item of result?.images ?? []) add(item, result);
  }
  return images;
}
