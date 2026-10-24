import { describe, expect, it, vi } from 'vitest';
import { DELIVERY, deliverFile, deliveryMethod, makeFile } from './fileDelivery';

const file = makeFile('{"a":1}', 'reading-journal-2026-10-24.json');

function setup({ touch = true, canShare = true, share = vi.fn(async () => {}) } = {}) {
  const nav = { share, canShare: vi.fn(() => canShare) };
  const win = {
    matchMedia: vi.fn(() => ({ matches: touch })),
    URL: { createObjectURL: vi.fn(() => 'blob:export'), revokeObjectURL: vi.fn() },
    setTimeout: vi.fn(),
  };
  return { nav, win, doc: document };
}

describe('deliveryMethod', () => {
  it('shares on a touch device that can share files', () => {
    expect(deliveryMethod(file, setup())).toBe(DELIVERY.SHARE);
  });

  it('downloads on a desktop, or when files can not be shared', () => {
    expect(deliveryMethod(file, setup({ touch: false }))).toBe(DELIVERY.DOWNLOAD);
    expect(deliveryMethod(file, setup({ canShare: false }))).toBe(DELIVERY.DOWNLOAD);
    const { win } = setup();
    expect(deliveryMethod(file, { nav: {}, win })).toBe(DELIVERY.DOWNLOAD);
  });
});

describe('deliverFile', () => {
  it('opens the share sheet with the file', async () => {
    const options = setup();
    expect(await deliverFile(file, options)).toBe('shared');
    expect(options.nav.share).toHaveBeenCalledWith({ files: [file], title: file.name });
    expect(options.win.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('reports a closed share sheet without downloading', async () => {
    const options = setup({ share: vi.fn(async () => Promise.reject(new DOMException('x', 'AbortError'))) });
    expect(await deliverFile(file, options)).toBe('cancelled');
    expect(options.win.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('downloads through a temporary link, and when sharing fails', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      expect(this.download).toBe('reading-journal-2026-10-24.json');
      expect(this.getAttribute('href')).toBe('blob:export');
    });
    const desktop = setup({ touch: false });
    expect(await deliverFile(file, desktop)).toBe('downloaded');
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(desktop.win.setTimeout).toHaveBeenCalled();

    const blocked = setup({ share: vi.fn(async () => Promise.reject(new DOMException('x', 'NotAllowedError'))) });
    expect(await deliverFile(file, blocked)).toBe('downloaded');
    expect(click).toHaveBeenCalledTimes(2);
    click.mockRestore();
  });
});
