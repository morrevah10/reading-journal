import { handleCover } from './cover.js';
import { HttpError, json } from './http.js';
import { handleImages } from './images.js';
import { handleNli } from './nli.js';
import { corsHeaders, isAllowedOrigin, parseAllowedOrigins } from './origin.js';

// GET /cover?url=…  → the image, with CORS, so the app can compress it into coverData
// GET /nli?q=…      → National Library of Israel search results (key added here)
// GET /images?q=…   → cover image search results (key added here)
const ROUTES = {
  '/cover': (params, env, deps) => handleCover(params, env, deps),
  '/nli': (params, env, deps) => handleNli(params, env, deps),
  '/images': (params, env, deps) => handleImages(params, env, deps),
};

export async function handleRequest(request, env, deps = {}) {
  const origin = request.headers.get('Origin');
  if (!isAllowedOrigin(origin, parseAllowedOrigins(env.ALLOWED_ORIGINS))) {
    return json({ error: 'forbidden-origin' }, 403);
  }
  const cors = corsHeaders(origin);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'GET') return json({ error: 'method-not-allowed' }, 405, cors);

  const url = new URL(request.url);
  const route = ROUTES[url.pathname];
  if (!route) return json({ error: 'not-found' }, 404, cors);

  try {
    const result = await route(url.searchParams, env, deps);
    const response = result instanceof Response ? result : json({ results: result });
    for (const [name, value] of Object.entries(cors)) response.headers.set(name, value);
    return response;
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.code }, error.status, cors);
    console.error(error);
    return json({ error: 'internal' }, 500, cors);
  }
}

export default {
  fetch: (request, env) => handleRequest(request, env),
};
