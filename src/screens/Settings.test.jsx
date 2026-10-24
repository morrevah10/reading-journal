import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signOutUser } from '../firebase/auth';
import { updateBook } from '../firebase/books';
import { loadCoverData } from '../api/coverSources';
import { renderWithAuth, testUser } from '../test/renderWithAuth';
import Settings from './Settings';

const fixtures = vi.hoisted(() => ({ books: [] }));

vi.mock('../firebase/books', () => ({
  subscribeBooks: vi.fn((uid, onData) => {
    onData(fixtures.books);
    return () => {};
  }),
  updateBook: vi.fn(async () => {}),
}));

vi.mock('../firebase/goals', () => ({
  subscribeGoals: vi.fn((uid, onData) => {
    onData([]);
    return () => {};
  }),
}));

vi.mock('../api/coverSources', async (importOriginal) => ({
  ...(await importOriginal()),
  loadCoverData: vi.fn(),
}));

beforeEach(() => {
  fixtures.books = [];
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Settings — save all covers', () => {
  const books = [
    { id: 'b1', title: 'Dune', coverUrl: 'https://books.google.com/b1', isbn: '9780441013593' },
    { id: 'b2', title: 'Saved', coverUrl: 'https://books.google.com/b2', coverData: 'data:x' },
    { id: 'b3', title: 'Foundation', isbn: '9780553293357' },
  ];

  it('saves the covers that are still only links and lists those not found', async () => {
    fixtures.books = books;
    loadCoverData.mockImplementation(async (url) => {
      if (url.includes('9780441013593')) return 'data:image/webp;base64,DUNE';
      throw new Error('404');
    });
    renderWithAuth(<Settings />);
    expect(screen.getByText('2 ספרים עם כריכה שעדיין לא נשמרה אצלך.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'שמור את כל הכריכות אצלי' }));

    expect(await screen.findByText('נשמרו 1 כריכות.')).toBeInTheDocument();
    expect(updateBook).toHaveBeenCalledWith(testUser.uid, 'b1', { coverData: 'data:image/webp;base64,DUNE' });
    expect(updateBook).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Foundation' })).toHaveAttribute('href', '/book/b3');
  });

  it('is disabled when every cover is saved or when offline', () => {
    fixtures.books = [books[1]];
    const { unmount } = renderWithAuth(<Settings />);
    expect(screen.getByText('כל הכריכות כבר שמורות אצלך.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'שמור את כל הכריכות אצלי' })).toBeDisabled();
    unmount();

    fixtures.books = books;
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderWithAuth(<Settings />);
    expect(screen.getByText('צריך חיבור לרשת כדי לשמור כריכות.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'שמור את כל הכריכות אצלי' })).toBeDisabled();
  });
});

describe('Settings', () => {
  it('shows the signed-in account details including the uid', () => {
    renderWithAuth(<Settings />);
    expect(screen.getByText(testUser.displayName)).toBeInTheDocument();
    expect(screen.getByText(testUser.email)).toBeInTheDocument();
    expect(screen.getByText(testUser.uid)).toBeInTheDocument();
  });

  it('has the genres, covers and export cards', () => {
    renderWithAuth(<Settings />);
    for (const name of ["ז'אנרים", 'כריכות', 'ייצוא נתונים']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('calls signOutUser when sign-out is clicked', async () => {
    renderWithAuth(<Settings />);
    await userEvent.click(screen.getByRole('button', { name: 'התנתקות' }));
    expect(signOutUser).toHaveBeenCalledTimes(1);
  });
});
