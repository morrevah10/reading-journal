// Small helpers shared by the Worker's handlers.

export class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export const UPSTREAM_TIMEOUT_MS = 8000;

// fetch() with a timeout; network failures become a 502 so the client sees a clean error.
export async function fetchUpstream(fetchImpl, url, init = {}) {
  try {
    return await fetchImpl(url, { ...init, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  } catch {
    throw new HttpError(502, 'upstream-unreachable');
  }
}
