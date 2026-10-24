// Hands a file to the user: the system share sheet on a phone or tablet that can share files
// (to save it to Drive, Files, etc.), otherwise a regular download.
// Sharing needs a fresh user gesture, so prepare the file first and call deliverFile from a click.

export const DELIVERY = { SHARE: 'share', DOWNLOAD: 'download' };

export function makeFile(text, fileName, type = 'application/json') {
  return new File([text], fileName, { type });
}

function isTouchDevice(win) {
  return Boolean(win.matchMedia?.('(pointer: coarse)').matches);
}

export function deliveryMethod(file, { nav = navigator, win = window } = {}) {
  const canShare =
    typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] });
  return canShare && isTouchDevice(win) ? DELIVERY.SHARE : DELIVERY.DOWNLOAD;
}

// → 'shared' | 'downloaded' | 'cancelled' (the share sheet was closed).
export async function deliverFile(file, { nav = navigator, win = window, doc = document } = {}) {
  if (deliveryMethod(file, { nav, win }) === DELIVERY.SHARE) {
    try {
      await nav.share({ files: [file], title: file.name });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      // Sharing failed for another reason (e.g. not allowed); fall back to a download.
    }
  }
  const url = win.URL.createObjectURL(file);
  const link = doc.createElement('a');
  link.href = url;
  link.download = file.name;
  doc.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke later: some browsers start the download only after the click handler returns.
  win.setTimeout(() => win.URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
