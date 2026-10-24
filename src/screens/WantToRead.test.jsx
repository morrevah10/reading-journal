import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithAuth, testUser } from '../test/renderWithAuth';
import { deleteBook, updateBook } from '../firebase/books';
import { todayISO } from '../lib/dates';
import WantToRead from './WantToRead';

const fixtures = vi.hoisted(() => ({ books: [] }));

vi.mock('../firebase/books', () => ({
  subscribeBooks: vi.fn((uid, onData) => {
    onData(fixtures.books);
    return () => {};
  }),
  updateBook: vi.fn(() => Promise.resolve()),
  deleteBook: vi.fn(() => Promise.resolve()),
}));

const ts = (ms) => ({ toMillis: () => ms });

const books = [
  { id: 'w1', status: 'want', title: 'Older Want', author: 'A. Author', createdAt: ts(1000) },
  { id: 'w2', status: 'want', title: 'Newer Want', createdAt: ts(2000) },
  { id: 'r1', status: 'reading', title: 'Reading Now', startDate: '2026-10-01', createdAt: ts(3000) },
  { id: 'f1', status: 'finished', title: 'Done', endDate: '2026-09-01', createdAt: ts(4000) },
];

function renderList() {
  return renderWithAuth(
    <Routes>
      <Route path="/want" element={<WantToRead />} />
      <Route path="/book/:id" element={<p>book-page</p>} />
      <Route path="/new" element={<p>new-book-screen</p>} />
    </Routes>,
    { route: '/want' },
  );
}

const itemTitles = () =>
  within(screen.getByRole('list', { name: 'רשימת רוצה לקרוא' }))
    .getAllByRole('listitem')
    .map((item) => within(item).getAllByText(/Want/)[0].textContent);

beforeEach(() => {
  fixtures.books = books;
});

describe('WantToRead', () => {
  it('lists only want books, most recently added first, with cover, title and author', () => {
    renderList();
    expect(itemTitles()).toEqual(['Newer Want', 'Older Want']);
    expect(screen.getByText('A. Author')).toBeInTheDocument();
    expect(screen.queryByText('Reading Now')).not.toBeInTheDocument();
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('"מתחיל לקרוא" moves the book to reading with today as the start date', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: 'מתחיל לקרוא את Older Want' }));
    expect(updateBook).toHaveBeenCalledWith(testUser.uid, 'w1', {
      status: 'reading',
      startDate: todayISO(),
    });
  });

  it('deletes a book only after confirmation', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: 'מחיקת Newer Want' }));
    expect(deleteBook).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'למחוק את הספר?' });
    expect(dialog).toHaveTextContent('Newer Want');
    await userEvent.click(within(dialog).getByRole('button', { name: 'מחיקה' }));
    expect(deleteBook).toHaveBeenCalledWith(testUser.uid, 'w2');
  });

  it('cancelling the delete keeps the book', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: 'מחיקת Newer Want' }));
    await userEvent.click(screen.getByRole('button', { name: 'ביטול' }));
    expect(deleteBook).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an error when starting fails', async () => {
    updateBook.mockRejectedValueOnce(new Error('offline'));
    renderList();
    await userEvent.click(screen.getByRole('button', { name: 'מתחיל לקרוא את Older Want' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('הפעולה נכשלה');
  });

  it('opens the book page from the list', async () => {
    renderList();
    await userEvent.click(screen.getByRole('link', { name: /Older Want/ }));
    expect(screen.getByText('book-page')).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    fixtures.books = books.filter((book) => book.status !== 'want');
    renderList();
    expect(screen.getByText(/הרשימה ריקה/)).toBeInTheDocument();
  });

  it('the floating button opens the new book screen', async () => {
    renderList();
    await userEvent.click(screen.getByRole('link', { name: /ספר חדש/ }));
    expect(screen.getByText('new-book-screen')).toBeInTheDocument();
  });
});
