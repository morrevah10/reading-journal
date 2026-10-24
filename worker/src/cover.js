import { HttpError, fetchUpstream } from './http.js';
import { verifyUrl } from './signing.js';

// /cover fetches images from these hosts, or from any https URL signed by /images
// (see signing.js), so it can't be used as a general proxy.
// Open Library is not here: it sends CORS headers and the app fetches it directly.
export const COVER_HOSTS = ['books.google.com', 'books.googleusercontent.com'];

export const COVER_MAX_BYTES = 5 * 1024 * 1024;

// Some sites (e.g. Wikimedia) refuse requests without an identifying User-Agent.
export const COVER_USER_AGENT =
  'reading-journal-bridge/1.0 (+https://morrevah10.github.io/reading-journal/)';

function parseHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function isAllowedCoverUrl(value) {
  const url = parseHttps(value);
  return Boolean(url) && COVER_HOSTS.includes(url.hostname);
}

// Downloads the image and returns it as a Response the browser may read (CORS added by index.js).
export async function handleCover(params, env, { fetchImpl = fetch } = {}) {
  const target = params.get('url');
  if (!target || !parseHttps(target)) throw new HttpError(400, 'invalid-url');
  const listed = isAllowedCoverUrl(target);
  const signed = !listed && (await verifyUrl(target, params.get('sig'), env.COVER_SIGNING_KEY));
  if (!listed && !signed) throw new HttpError(400, 'invalid-url');

  const upstream = await fetchUpstream(fetchImpl, target, {
    redirect: 'follow',
    headers: { 'User-Agent': COVER_USER_AGENT, Accept: 'image/*' },
  });
  // A redirect must stay on https, and for listed hosts on the listed hosts.
  if (upstream.url) {
    const ok = listed ? isAllowedCoverUrl(upstream.url) : Boolean(parseHttps(upstream.url));
    if (!ok) throw new HttpError(400, 'invalid-url');
  }
  if (!upstream.ok) throw new HttpError(upstream.status === 404 ? 404 : 502, 'upstream-error');

  const type = upstream.headers.get('Content-Type') ?? '';
  if (!type.startsWith('image/')) throw new HttpError(415, 'not-an-image');
  const declared = Number(upstream.headers.get('Content-Length'));
  if (declared > COVER_MAX_BYTES) throw new HttpError(413, 'too-large');

  const body = await upstream.arrayBuffer();
  if (body.byteLength > COVER_MAX_BYTES) throw new HttpError(413, 'too-large');

  return new Response(body, {
    headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' },
  });
}
