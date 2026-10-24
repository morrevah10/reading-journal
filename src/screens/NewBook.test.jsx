import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithAuth, testUser } from '../test/renderWithAuth';
import { addBook } from '../firebase/books';
import { searchBooks } from '../api/googleBooks';
import { todayISO } from '../lib/dates';
import NewBook from './NewBook';

vi.mock('../firebase/books', () => ({
  addBook: vi.fn(() => Promise.resolve('new-book-id')),
}));

vi.mock('../api/googleBooks', () => ({
  searchBooks: vi.fn(),
}));

const duneResult = {
  googleId: 'g1',
  title: 'Dune',
  author: 'Frank Herbert',
  pages: 412,
  thumbnailUrl: 'https://books.google.com/dune.jpg',
  isbn: '9780441013593',
};

function renderNewBook() {
  return renderWithAuth(
    <Routes>
      <Route path="/new" element={<NewBook />} />
      <Route path="/book/:id" element={<p>book-page</p>} />
    </Routes>,
    { route: '/new' },
  );
}

beforeEach(() => {
  searchBooks.mockResolvedValue([duneResult]);
});

describe('NewBook', () => {
  it('shows Google Books results and fills the form on select', async () => {
    renderNewBook();
    await userEvent.type(screen.getByRole('searchbox'), 'dune');
    const result = await screen.findByRole('button', { name: /Dune/ });
    await userEvent.click(result);

    expect(screen.getByRole('textbox', { name: /שם הספר/ })).toHaveValue('Dune');
    expect(screen.getByRole('textbox', { name: 'סופר' })).toHaveValue('Frank Herbert');
    expect(screen.getByRole('spinbutton', { name: 'עמודים' })).toHaveValue(412);
    expect(screen.getByRole('img', { name: 'כריכת Dune' })).toHaveAttribute(
      'src',
      'https://books.google.com/dune.jpg',
    );
  });

  it('shows a message when search fails', async () => {
    searchBooks.mockRejectedValue(new Error('429'));
    renderNewBook();
    await userEvent.type(screen.getByRole('searchbox'), 'dune');
    expect(await screen.findByRole('alert')).toHaveTextContent('החיפוש נכשל');
  });

  it('requires a title', async () => {
    renderNewBook();
    await userEvent.click(screen.getByRole('button', { name: 'מתחיל עכשיו' }));
    expect(screen.getByText('שם הספר הוא שדה חובה')).toBeInTheDocument();
    expect(addBook).not.toHaveBeenCalled();
  });

  it('"מתחיל עכשיו" saves a reading book starting today and opens it', async () => {
    renderNewBook();
    await userEvent.type(screen.getByRole('textbox', { name: /שם הספר/ }), 'My Book');
    await userEvent.type(screen.getByRole('combobox', { name: "ז'אנר" }), 'רומן');
    await userEvent.click(screen.getByRole('button', { name: 'מתחיל עכשיו' }));

    expect(addBook).toHaveBeenCalledWith(
      testUser.uid,
      expect.objectContaining({
        title: 'My Book',
        genre: 'רומן',
        status: 'reading',
        startDate: todayISO(),
        coverUrl: null,
        coverData: null,
      }),
    );
    expect(await screen.findByText('book-page')).toBeInTheDocument();
  });

  it('"לרשימת רוצה לקרוא" saves a want book without dates', async () => {
    renderNewBook();
    await userEvent.type(screen.getByRole('textbox', { name: /שם הספר/ }), 'Later');
    await userEvent.click(screen.getByRole('button', { name: 'לרשימת רוצה לקרוא' }));
    expect(addBook).toHaveBeenCalledWith(
      testUser.uid,
      expect.objectContaining({ title: 'Later', status: 'want', startDate: null }),
    );
  });

  it('shows an error when saving fails', async () => {
    addBook.mockRejectedValueOnce(new Error('offline'));
    renderNewBook();
    await userEvent.type(screen.getByRole('textbox', { name: /שם הספר/ }), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'מתחיל עכשיו' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('השמירה נכשלה');
  });
});
