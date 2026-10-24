// Client-side cover compression for manual uploads. The stored value is a data URL
// string inside the book document, so its length is what counts toward the limit.
export const COVER_MAX_BYTES = 40 * 1024;
export const COVER_MAX_WIDTH = 360;
export const COVER_MAX_HEIGHT = 540;

const SCALES = [1, 0.8, 0.64, 0.5, 0.4, 0.3];
const QUALITIES = [0.8, 0.7, 0.6, 0.5, 0.4];

export class CoverError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Scales (width, height) down to fit within the box, keeping the aspect ratio. Never scales up.
export function fitWithin(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

// Tries decreasing quality, then decreasing size, until the data URL fits in maxBytes.
// `encode(width, height, type, quality)` returns a data URL (sync or async).
// WebP is preferred; if the browser can't encode it, JPEG is used instead.
export async function compressToLimit(encode, { width, height }, maxBytes = COVER_MAX_BYTES) {
  let type = 'image/webp';
  for (const scale of SCALES) {
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    for (const quality of QUALITIES) {
      let dataUrl;
      try {
        dataUrl = await encode(w, h, type, quality);
      } catch (error) {
        if (error?.name === 'SecurityError') {
          throw new CoverError('tainted', 'לא ניתן לעבד את התמונה הזו');
        }
        throw error;
      }
      if (type === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
        // Unsupported types fall back to PNG; retry this step as JPEG.
        type = 'image/jpeg';
        dataUrl = await encode(w, h, type, quality);
      }
      if (dataUrl.length <= maxBytes) return dataUrl;
    }
  }
  throw new CoverError('too-large', 'התמונה גדולה מדי גם אחרי דחיסה');
}

// Browser glue: reads an image file, draws it on a canvas and compresses it.
export async function compressImageFile(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new CoverError('not-image', 'הקובץ שנבחר אינו תמונה');
  }
  const source = await loadImage(file);
  try {
    const size = fitWithin(source.width, source.height, COVER_MAX_WIDTH, COVER_MAX_HEIGHT);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const encode = (w, h, type, quality) => {
      canvas.width = w;
      canvas.height = h;
      // White background so transparent images don't turn black as JPEG.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, w, h);
      context.drawImage(source, 0, 0, w, h);
      return canvas.toDataURL(type, quality);
    };
    return await compressToLimit(encode, size);
  } finally {
    source.close?.();
  }
}

async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to <img> decoding (e.g. HEIC on Safari).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } catch {
    throw new CoverError('decode', 'לא ניתן לקרוא את התמונה');
  } finally {
    URL.revokeObjectURL(url);
  }
}
