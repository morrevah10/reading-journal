import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { compressImageFile } from '../lib/coverImage';
import { editionCoverCandidates, loadCoverData, webCoverCandidates } from '../api/coverSources';
import CoverPicker from './CoverPicker';

vi.mock('../lib/coverImage', () => ({
  compressImageFile: vi.fn(),
}));

const bridge = vi.hoisted(() => ({ configured: false }));
vi.mock('../api/bridge', () => ({
  isBridgeConfigured: () => bridge.configured,
}));

// The real URL helpers are kept; only network-bound functions are mocked.
vi.mock('../api/coverSources', async (importOriginal) => ({
  ...(await importOriginal()),
  loadCoverData: vi.fn(),
  editionCoverCandidates: vi.fn(),
  webCoverCandidates: vi.fn(),
}));

const olCandidate = (id) => ({
  key: `ol:${id}`,
  source: 'openlibrary',
  previewUrl: `https://covers.openlibrary.org/b/id/${id}-M.jpg?default=false`,
  downloadUrl: `https://covers.openlibrary.org/b/id/${id}-L.jpg?default=false`,
});

const webCandidate = (i) => ({
  key: `web:${i}`,
  source: 'web',
  previewUrl: `https://shop.example/${i}.jpg`,
  downloadUrl: `https://shop.example/${i}.jpg`,
  sig: `sig-${i}`,
});

// jsdom does not load images; this gives an image a size and fires its load event.
function loadImage(img, width = 300, height = 450) {
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
  fireEvent.load(img);
}

// Fires load (or error) on the picker's hidden images; `size(src)` gives [width, height].
async function settleImages({ fail = () => false, size = () => [300, 450] } = {}) {
  const preload = await screen.findByTestId('cover-preload');
  await vi.waitFor(() => expect(preload.querySelector('img')).not.toBeNull());
  for (const img of [...preload.querySelectorAll('img')]) {
    const src = img.getAttribute('src');
    if (fail(src)) fireEvent.error(img);
    else loadImage(img, ...size(src));
  }
}

async function openChooser() {
  await userEvent.click(screen.getByRole('button', { name: 'חפש כריכה' }));
  return screen.findByRole('dialog');
}

beforeEach(() => {
  bridge.configured = false;
  editionCoverCandidates.mockResolvedValue([olCandidate(1), olCandidate(2)]);
  webCoverCandidates.mockResolvedValue([]);
  loadCoverData.mockRejectedValue(new Error('404'));
});

describe('CoverPicker — upload and camera', () => {
  it('compresses an uploaded image into coverData', async () => {
    compressImageFile.mockResolvedValue('data:image/webp;base64,AAA');
    const onChange = vi.fn();
    render(<CoverPicker title="Dune" coverUrl={null} coverData={null} onChange={onChange} />);
    const file = new File(['x'], 'cover.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByTestId('cover-file-input'), file);
    expect(compressImageFile).toHaveBeenCalledWith(file);
    expect(onChange).toHaveBeenCalledWith({ coverData: 'data:image/webp;base64,AAA' });
  });

  it('opens the camera for "צלם כריכה"', async () => {
    compressImageFile.mockResolvedValue('data:image/webp;base64,CAM');
    const onChange = vi.fn();
    render(<CoverPicker title="Dune" onChange={onChange} />);
    const camera = screen.getByTestId('cover-camera-input');
    expect(camera).toHaveAttribute('capture', 'environment');
    const click = vi.spyOn(camera, 'click');
    await userEvent.click(screen.getByRole('button', { name: 'צלם כריכה' }));
    expect(click).toHaveBeenCalled();
    await userEvent.upload(camera, new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));
    expect(onChange).toHaveBeenCalledWith({ coverData: 'data:image/webp;base64,CAM' });
  });

  it('shows an error when compression fails', async () => {
    compressImageFile.mockRejectedValue(new Error('התמונה גדולה מדי גם אחרי דחיסה'));
    render(<CoverPicker title="Dune" onChange={vi.fn()} />);
    await userEvent.upload(
      screen.getByTestId('cover-file-input'),
      new File(['x'], 'c.jpg', { type: 'image/jpeg' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('גדולה מדי');
  });

  it('prefers the saved cover in the preview and removes both cover fields', async () => {
    const onChange = vi.fn();
    render(
      <CoverPicker
        title="Dune"
        coverUrl="https://google/cover.jpg"
        coverData="data:image/webp;base64,AAA"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/webp;base64,AAA');
    await userEvent.click(screen.getByRole('button', { name: 'הסר כריכה' }));
    expect(onChange).toHaveBeenCalledWith({ coverData: null, coverUrl: null });
  });
});

describe('CoverPicker — automatic cover (step 1)', () => {
  const result = {
    title: 'Dune',
    thumbnailUrl: 'https://books.google.com/books/content?id=x&zoom=1',
    isbn: '9780441013593',
  };

  it('saves the first cover that loads, trying Open Library by ISBN', async () => {
    loadCoverData.mockResolvedValue('data:image/webp;base64,OL');
    const onChange = vi.fn();
    render(<CoverPicker title="Dune" onChange={onChange} autoSource={{ result }} />);
    expect(screen.getByRole('status')).toHaveTextContent('מחפש כריכה');
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith({ coverData: 'data:image/webp;base64,OL' }));
    // Without the Worker only the Open Library URL can be downloaded.
    expect(loadCoverData).toHaveBeenCalledTimes(1);
    expect(loadCoverData).toHaveBeenCalledWith(
      'https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg?default=false',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('tries the Google cover first, upgraded, when the Worker is configured', async () => {
    bridge.configured = true;
    loadCoverData.mockResolvedValue('data:image/webp;base64,G');
    render(<CoverPicker title="Dune" onChange={vi.fn()} autoSource={{ result }} />);
    await vi.waitFor(() => expect(loadCoverData).toHaveBeenCalled());
    expect(loadCoverData.mock.calls[0][0]).toBe(
      'https://books.google.com/books/content?id=x&zoom=1&fife=w480-h720',
    );
  });

  it('opens the picker when no automatic cover is found (step 2)', async () => {
    render(<CoverPicker title="Dune" author="Frank Herbert" onChange={vi.fn()} autoSource={{ result }} />);
    const dialog = await screen.findByRole('dialog', { name: 'בחירת כריכה' });
    await settleImages();
    expect(await within(dialog).findAllByRole('img')).toHaveLength(2);
    expect(editionCoverCandidates).toHaveBeenCalledWith(
      { title: 'Dune', author: 'Frank Herbert' },
      expect.anything(),
    );
  });
});

describe('CoverChooser (step 2)', () => {
  it('saves the chosen cover compressed, keeping its link as a fallback', async () => {
    loadCoverData.mockResolvedValue('data:image/webp;base64,PICK');
    const onChange = vi.fn();
    render(<CoverPicker title="Dune" onChange={onChange} />);
    const dialog = await openChooser();
    await settleImages();
    await userEvent.click(await within(dialog).findByRole('button', { name: 'כריכה 2' }));
    expect(loadCoverData).toHaveBeenCalledWith(olCandidate(2).downloadUrl, { sig: undefined });
    expect(onChange).toHaveBeenCalledWith({
      coverData: 'data:image/webp;base64,PICK',
      coverUrl: olCandidate(2).previewUrl,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('loads up to 12 candidates, half from the web, and shows the first 6 that load', async () => {
    bridge.configured = true;
    editionCoverCandidates.mockResolvedValue([1, 2, 3, 4, 5, 6, 7, 8].map(olCandidate));
    webCoverCandidates.mockResolvedValue([1, 2, 3, 4, 5, 6, 7, 8].map(webCandidate));
    loadCoverData.mockResolvedValue('data:image/webp;base64,WEB');
    render(<CoverPicker title="Dune" onChange={vi.fn()} />);
    const dialog = await openChooser();
    expect(await within(dialog).findByText('טוען תמונות…')).toBeInTheDocument();

    const preload = screen.getByTestId('cover-preload');
    const pending = [...preload.querySelectorAll('img')];
    expect(pending).toHaveLength(12);
    expect(pending.filter((img) => img.src.includes('shop.example'))).toHaveLength(6);

    // A web image that loads first is shown first.
    loadImage(pending.find((img) => img.src === 'https://shop.example/1.jpg'));
    for (const img of pending.filter((i) => i.src !== 'https://shop.example/1.jpg')) loadImage(img);
    const images = within(dialog).getAllByRole('img');
    expect(images).toHaveLength(6);
    expect(images[0]).toHaveAttribute('src', 'https://shop.example/1.jpg');

    // A web image is downloaded with its signature.
    await userEvent.click(within(dialog).getByRole('button', { name: 'כריכה 1' }));
    expect(loadCoverData).toHaveBeenCalledWith('https://shop.example/1.jpg', { sig: 'sig-1' });
  });

  it('hides images that fail to load', async () => {
    bridge.configured = true;
    webCoverCandidates.mockResolvedValue([1, 2].map(webCandidate));
    render(<CoverPicker title="Dune" onChange={vi.fn()} />);
    const dialog = await openChooser();
    await settleImages({ fail: (src) => src.includes('shop.example/1') || src.includes('/id/2-') });
    const shown = within(dialog).getAllByRole('img').map((img) => img.getAttribute('src'));
    expect(shown).toEqual([olCandidate(1).previewUrl, 'https://shop.example/2.jpg']);
    expect(screen.getByTestId('cover-preload').querySelectorAll('img')).toHaveLength(0);
  });

  it('hides images that load but are not cover-shaped', async () => {
    bridge.configured = true;
    webCoverCandidates.mockResolvedValue([1, 2, 3].map(webCandidate));
    render(<CoverPicker title="Dune" onChange={vi.fn()} />);
    const dialog = await openChooser();
    const sizes = {
      'https://shop.example/1.jpg': [48, 48], // an icon
      'https://shop.example/2.jpg': [1200, 300], // a banner
      'https://shop.example/3.jpg': [1000, 1000], // a store image padded to a square
    };
    await settleImages({ size: (src) => sizes[src] ?? [300, 450] });
    const shown = within(dialog).getAllByRole('img').map((img) => img.getAttribute('src'));
    expect(shown).toEqual([olCandidate(1).previewUrl, olCandidate(2).previewUrl, 'https://shop.example/3.jpg']);
  });

  it('shows an error and stays open when a chosen cover fails', async () => {
    render(<CoverPicker title="Dune" onChange={vi.fn()} />);
    const dialog = await openChooser();
    await settleImages();
    await userEvent.click(await within(dialog).findByRole('button', { name: 'כריכה 1' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('לא ניתן לשמור');
  });

  it('offers a photo or upload when nothing is found (step 3)', async () => {
    editionCoverCandidates.mockResolvedValue([]);
    render(<CoverPicker title="Dune" onChange={vi.fn()} />);
    const dialog = await openChooser();
    expect(await within(dialog).findByText(/לא נמצאו כריכות/)).toBeInTheDocument();
    const upload = vi.spyOn(screen.getByTestId('cover-file-input'), 'click');
    await userEvent.click(within(dialog).getByRole('button', { name: 'העלה תמונה' }));
    expect(upload).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers the camera when no image loads', async () => {
    render(<CoverPicker title="Dune" onChange={vi.fn()} />);
    const dialog = await openChooser();
    await settleImages({ fail: () => true });
    expect(within(dialog).getByText(/לא נמצאו כריכות/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('img')).not.toBeInTheDocument();
    const camera = vi.spyOn(screen.getByTestId('cover-camera-input'), 'click');
    await userEvent.click(within(dialog).getByRole('button', { name: 'צלם כריכה' }));
    expect(camera).toHaveBeenCalled();
  });

  it('can hand over to a photo or upload even when covers were found', async () => {
    render(<CoverPicker title="Dune" onChange={vi.fn()} />);
    const dialog = await openChooser();
    await settleImages();
    await userEvent.click(within(dialog).getByRole('button', { name: 'צילום או העלאה' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/לא נמצאה כריכה. אפשר לצלם/)).toBeInTheDocument();
  });

  it('needs a title to search', () => {
    render(<CoverPicker title="" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'חפש כריכה' })).toBeDisabled();
  });
});
