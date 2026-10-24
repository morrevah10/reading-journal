import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchAllData } from '../firebase/exportData';
import { deliverFile, deliveryMethod, makeFile } from '../platform/fileDelivery';
import { REAL_BOOKS, REAL_GOALS, REAL_NOTES, REAL_QUOTES } from '../test/fixtures/realBooks';
import { renderWithAuth, testUser } from '../test/renderWithAuth';
import ExportData from './ExportData';

vi.mock('../firebase/exportData', () => ({ fetchAllData: vi.fn() }));

vi.mock('../platform/fileDelivery', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    makeFile: vi.fn(actual.makeFile),
    deliveryMethod: vi.fn(),
    deliverFile: vi.fn(),
  };
});

beforeEach(() => {
  fetchAllData.mockResolvedValue({
    books: REAL_BOOKS,
    notes: REAL_NOTES,
    quotes: REAL_QUOTES,
    goals: REAL_GOALS,
    genres: null,
  });
  deliveryMethod.mockReturnValue('download');
  deliverFile.mockResolvedValue('downloaded');
});

const prepare = () => userEvent.click(screen.getByRole('button', { name: 'הכן קובץ ייצוא' }));

describe('ExportData', () => {
  it('prepares the file and shows what is in it', async () => {
    renderWithAuth(<ExportData />);
    await prepare();
    expect(fetchAllData).toHaveBeenCalledWith(testUser.uid);
    expect(await screen.findByText(/9 ספרים, 3 נקודות, 1 ציטוטים, 2 יעדים · \d+ KB/)).toBeInTheDocument();

    const [text, fileName] = makeFile.mock.calls[0];
    expect(fileName).toMatch(/^reading-journal-\d{4}-\d{2}-\d{2}\.json$/);
    const data = JSON.parse(text);
    expect(data.books.find((book) => book.id === 'oz-love').coverData).toMatch(/^data:image/);
    // The list was never saved, so the default genres go into the file.
    expect(data.settings.genres).toHaveLength(14);
  });

  it('downloads the file from a second tap', async () => {
    renderWithAuth(<ExportData />);
    await prepare();
    await userEvent.click(await screen.findByRole('button', { name: 'הורד את הקובץ' }));
    expect(deliverFile).toHaveBeenCalledWith(expect.any(File));
    expect(deliverFile.mock.calls[0][0].name).toMatch(/^reading-journal-/);
    expect(await screen.findByText('הקובץ הורד.')).toBeInTheDocument();
  });

  it('shares the file where sharing is available', async () => {
    deliveryMethod.mockReturnValue('share');
    deliverFile.mockResolvedValue('shared');
    renderWithAuth(<ExportData />);
    await prepare();
    await userEvent.click(await screen.findByRole('button', { name: 'שתף את הקובץ' }));
    expect(await screen.findByText('הקובץ שותף.')).toBeInTheDocument();
  });

  it('says nothing when the share sheet is closed', async () => {
    deliveryMethod.mockReturnValue('share');
    deliverFile.mockResolvedValue('cancelled');
    renderWithAuth(<ExportData />);
    await prepare();
    await userEvent.click(await screen.findByRole('button', { name: 'שתף את הקובץ' }));
    expect(screen.queryByText(/הקובץ (שותף|הורד)/)).not.toBeInTheDocument();
  });

  it('reports a failed export', async () => {
    fetchAllData.mockRejectedValue(new Error('unavailable'));
    renderWithAuth(<ExportData />);
    await prepare();
    expect(await screen.findByRole('alert')).toHaveTextContent('הייצוא נכשל');
    expect(screen.getByRole('button', { name: 'הכן קובץ ייצוא' })).toBeEnabled();
  });
});
