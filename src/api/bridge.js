// Client for the Cloudflare Worker in worker/ (cover downloads, NLI search, image search).
// Without VITE_BRIDGE_URL the app still works: those features are simply skipped.

export class BridgeError extends Error {
  constructor(status, code) {
    super(`Bridge request failed: ${code ?? status}`);
    this.status = status;
    this.code = code ?? null;
  }
}

export function bridgeBaseUrl(value = import.meta.env.VITE_BRIDGE_URL) {
  return value ? value.replace(/\/+$/, '') : null;
}

export function isBridgeConfigured() {
  return Boolean(bridgeBaseUrl());
}

export function bridgeUrl(path, params, base = bridgeBaseUrl()) {
  if (!base) return null;
  return `${base}${path}?${new URLSearchParams(params)}`;
}

export async function bridgeFetch(path, params, { signal, fetchImpl = globalThis.fetch, base } = {}) {
  const url = bridgeUrl(path, params, base === undefined ? bridgeBaseUrl() : base);
  if (!url) throw new BridgeError(0, 'not-configured');
  const response = await fetchImpl(url, { signal });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new BridgeError(response.status, body.error);
  }
  return response;
}

// For JSON endpoints: returns the `results` list.
export async function bridgeResults(path, params, options) {
  const response = await bridgeFetch(path, params, options);
  const data = await response.json();
  return Array.isArray(data.results) ? data.results : [];
}
