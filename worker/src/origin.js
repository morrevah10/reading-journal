// Only the app's own origins may call the Worker. This stops other websites from using it
// through a browser; it is not a defence against scripts that forge the Origin header,
// which is why the API keys never leave the Worker and /cover only returns images.

export function parseAllowedOrigins(value = '') {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

// An entry is an exact origin, or "scheme://host:*" for any port on that host.
export function isAllowedOrigin(origin, allowed) {
  if (!origin) return false;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.origin !== origin) return false;
  return allowed.some((entry) => {
    if (entry.endsWith(':*')) {
      const base = entry.slice(0, -2);
      return `${url.protocol}//${url.hostname}` === base;
    }
    return entry === origin;
  });
}

export function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
