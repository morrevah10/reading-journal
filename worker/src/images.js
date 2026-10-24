import { HttpError, fetchUpstream } from './http.js';
import { ISRAELI_BOOK_SITES, isHebrewQuery, preferIsraeliSites } from './israeliSites.js';
import { buildTavilyRequest, normalizeTavilyResponse } from './providers/tavily.js';
import { signUrl } from './signing.js';

// The picker shows 6, but asks for more because some images fail to load in the browser.
export const IMAGES_MAX_RESULTS = 12;

// Cover image search for the cover picker. The provider is Tavily (providers/tavily.js).
// Hebrew queries prefer Israeli book sites. Each image comes with a signature so /cover
// will download it (see signing.js).
export async function handleImages(params, env, { fetchImpl = fetch } = {}) {
  const q = params.get('q')?.trim() ?? '';
  if (q.length < 2) return [];
  if (!env.TAVILY_API_KEY || !env.COVER_SIGNING_KEY) throw new HttpError(503, 'not-configured');

  const hebrew = isHebrewQuery(q);
  const { url, init } = buildTavilyRequest(
    q,
    env.TAVILY_API_KEY,
    hebrew ? { preferDomains: ISRAELI_BOOK_SITES, country: 'israel' } : {},
  );
  const upstream = await fetchUpstream(fetchImpl, url, init);
  if (upstream.status === 429 || upstream.status === 432) throw new HttpError(429, 'rate-limited');
  if (!upstream.ok) throw new HttpError(502, 'upstream-error');

  const found = normalizeTavilyResponse(await upstream.json());
  const images = (hebrew ? preferIsraeliSites(found) : found).slice(0, IMAGES_MAX_RESULTS);
  return Promise.all(
    images.map(async (image) => ({ ...image, sig: await signUrl(image.imageUrl, env.COVER_SIGNING_KEY) })),
  );
}
