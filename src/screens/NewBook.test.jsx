import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
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

  it('"כבר קראתי" opens the history fields with an empty end date', async () => {
    renderNewBook();
    expect(screen.queryByText('פרטי הקריאה')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'כבר קראתי' }));
    const group = screen.getByRole('group', { name: 'פרטי הקריאה' });
    expect(within(group).getByLabelText('תאריך סיום *')).toHaveValue('');
    expect(within(group).getByLabelText('תאריך התחלה (לא חובה)')).toHaveValue('');
    // The "start now" date and the other save buttons are hidden while it is open.
    expect(screen.queryByLabelText('תאריך התחלה (אם מתחיל עכשיו)')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מתחיל עכשיו' })).not.toBeInTheDocument();
  });

  it('"כבר קראתי" requires an end date', async () => {
    renderNewBook();
    await userEvent.type(screen.getByRole('textbox', { name: /שם הספר/ }), 'Old');
    await userEvent.click(screen.getByRole('button', { name: 'כבר קראתי' }));
    await userEvent.click(screen.getByRole('button', { name: 'שמירה' }));
    expect(screen.getByText('תאריך סיום הוא שדה חובה')).toBeInTheDocument();
    expect(addBook).not.toHaveBeenCalled();
  });

  it('"כבר קראתי" saves a finished book with dates, rating and review', async () => {
    renderNewBook();
    await userEvent.type(screen.getByRole('textbox', { name: /שם הספר/ }), 'Old');
    await userEvent.click(screen.getByRole('button', { name: 'כבר קראתי' }));
    await userEvent.type(screen.getByLabelText('תאריך התחלה (לא חובה)'), '2024-01-10');
    await userEvent.type(screen.getByLabelText('תאריך סיום *'), '2024-02-01');
    await userEvent.click(screen.getByRole('button', { name: '4 כוכבים' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'ביקורת קצרה' }), 'Good');
    await userEvent.click(screen.getByRole('button', { name: 'שמירה' }));

    expect(addBook).toHaveBeenCalledWith(
      testUser.uid,
      expect.objectContaining({
        title: 'Old',
        status: 'finished',
        startDate: '2024-01-10',
        endDate: '2024-02-01',
        rating: 4,
        review: 'Good',
      }),
    );
    expect(await screen.findByText('book-page')).toBeInTheDocument();
  });

  it('"כבר קראתי" saves without a start date', async () => {
    renderNewBook();
    await userEvent.type(screen.getByRole('textbox', { name: /שם הספר/ }), 'Old');
    await userEvent.click(screen.getByRole('button', { name: 'כבר קראתי' }));
    await userEvent.type(screen.getByLabelText('תאריך סיום *'), '2024-02-01');
    await userEvent.click(screen.getByRole('button', { name: 'שמירה' }));
    expect(addBook).toHaveBeenCalledWith(
      testUser.uid,
      expect.objectContaining({ status: 'finished', startDate: null, endDate: '2024-02-01', rating: null }),
    );
  });

  it('"כבר קראתי" blocks a future end date', async () => {
    renderNewBook();
    await userEvent.type(screen.getByRole('textbox', { name: /שם הספר/ }), 'Old');
    await userEvent.click(screen.getByRole('button', { name: 'כבר קראתי' }));
    await userEvent.type(screen.getByLabelText('תאריך סיום *'), '2099-01-01');
    await userEvent.click(screen.getByRole('button', { name: 'שמירה' }));
    expect(screen.getByText('התאריך לא יכול להיות בעתיד')).toBeInTheDocument();
    expect(addBook).not.toHaveBeenCalled();
  });

  it('cancelling "כבר קראתי" brings back the other save buttons', async () => {
    renderNewBook();
    await userEvent.click(screen.getByRole('button', { name: 'כבר קראתי' }));
    await userEvent.click(screen.getByRole('button', { name: 'ביטול' }));
    expect(screen.getByRole('button', { name: 'מתחיל עכשיו' })).toBeInTheDocument();
    expect(screen.queryByText('פרטי הקריאה')).not.toBeInTheDocument();
  });

  it('"מתחיל עכשיו" blocks a future start date', async () => {
    renderNewBook();
    await userEvent.type(screen.getByRole('textbox', { name: /שם הספר/ }), 'X');
    const startInput = screen.getByLabelText('תאריך התחלה (אם מתחיל עכשיו)');
    await userEvent.clear(startInput);
    await userEvent.type(startInput, '2099-01-01');
    await userEvent.click(screen.getByRole('button', { name: 'מתחיל עכשיו' }));
    expect(screen.getByText('התאריך לא יכול להיות בעתיד')).toBeInTheDocument();
    expect(addBook).not.toHaveBeenCalled();
  });

  it('shows an error when saving fails', async () => {
    addBook.mockRejectedValueOnce(new Error('offline'));
    renderNewBook();
    await userEvent.type(screen.getByRole('textbox', { name: /שם הספר/ }), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'מתחיל עכשיו' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('השמירה נכשלה');
  });
});
