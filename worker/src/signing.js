// HMAC signatures for image URLs returned by /images. Search results point at arbitrary sites,
// so /cover only downloads such a URL when it carries a signature made by this Worker.
// The key is the COVER_SIGNING_KEY secret (any long random string).

const encoder = new TextEncoder();

async function hmac(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function signUrl(url, key) {
  return hmac(key, url);
}

export async function verifyUrl(url, signature, key) {
  if (!key || typeof signature !== 'string' || !signature) return false;
  const expected = await hmac(key, url);
  if (expected.length !== signature.length) return false;
  // Constant-time comparison.
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
