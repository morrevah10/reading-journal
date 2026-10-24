import { describe, expect, it, vi } from 'vitest';
import { COVER_MAX_BYTES, CoverError, compressToLimit, fitWithin } from './coverImage';

// Fake encoder: output length grows with pixel count and quality.
function fakeEncoder({ webp = true, bytesPerPixel = 1 } = {}) {
  return vi.fn((w, h, type, quality) => {
    const actualType = type === 'image/webp' && !webp ? 'image/png' : type;
    const size = Math.round(w * h * quality * bytesPerPixel);
    return `data:${actualType};base64,${'A'.repeat(size)}`;
  });
}

describe('fitWithin', () => {
  it('scales down keeping the aspect ratio', () => {
    expect(fitWithin(1200, 1800, 360, 540)).toEqual({ width: 360, height: 540 });
    expect(fitWithin(2000, 1000, 360, 540)).toEqual({ width: 360, height: 180 });
  });

  it('never scales up', () => {
    expect(fitWithin(200, 300, 360, 540)).toEqual({ width: 200, height: 300 });
  });
});

describe('compressToLimit', () => {
  it('returns the first encoding that fits', async () => {
    const encode = fakeEncoder({ bytesPerPixel: 0.1 });
    const result = await compressToLimit(encode, { width: 200, height: 300 });
    expect(result.startsWith('data:image/webp')).toBe(true);
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it('lowers quality and size until the result is at most 40KB', async () => {
    const encode = fakeEncoder({ bytesPerPixel: 1 });
    const result = await compressToLimit(encode, { width: 360, height: 540 });
    expect(result.length).toBeLessThanOrEqual(COVER_MAX_BYTES);
    expect(encode.mock.calls.length).toBeGreaterThan(1);
  });

  it('falls back to JPEG when WebP is not supported', async () => {
    const encode = fakeEncoder({ webp: false, bytesPerPixel: 0.1 });
    const result = await compressToLimit(encode, { width: 200, height: 300 });
    expect(result.startsWith('data:image/jpeg')).toBe(true);
  });

  it('throws when the image cannot fit even at the smallest size', async () => {
    const encode = fakeEncoder({ bytesPerPixel: 100 });
    await expect(compressToLimit(encode, { width: 360, height: 540 })).rejects.toMatchObject({
      code: 'too-large',
    });
  });

  it('throws a clear error for a tainted canvas', async () => {
    const encode = () => {
      const error = new Error('tainted');
      error.name = 'SecurityError';
      throw error;
    };
    const promise = compressToLimit(encode, { width: 100, height: 150 });
    await expect(promise).rejects.toBeInstanceOf(CoverError);
    await expect(promise).rejects.toMatchObject({ code: 'tainted' });
  });
});
