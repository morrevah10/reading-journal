import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithAuth, testUser } from '../test/renderWithAuth';
import { deleteBook, updateBook } from '../firebase/books';
import { addEntry, deleteEntry, updateEntry } from '../firebase/entries';
import { todayISO } from '../lib/dates';
import BookPage from './BookPage';

const fixtures = vi.hoisted(() => ({ book: null, notes: [], quotes: [] }));

vi.mock('../firebase/books', () => ({
  subscribeBook: vi.fn((uid, id, onData) => {
    onData(fixtures.book);
    return () => {};
  }),
  updateBook: vi.fn(() => Promise.resolve()),
  deleteBook: vi.fn(() => Promise.resolve()),
}));

vi.mock('../firebase/entries', () => ({
  ENTRY_KINDS: { NOTES: 'notes', QUOTES: 'quotes' },
  subscribeEntries: vi.fn((uid, bookId, kind, onData) => {
    onData(fixtures[kind]);
    return () => {};
  }),
  addEntry: vi.fn(() => Promise.resolve('new-id')),
  updateEntry: vi.fn(() => Promise.resolve()),
  deleteEntry: vi.fn(() => Promise.resolve()),
}));

const baseBook = {
  id: 'b1',
  title: 'Dune',
  author: 'Frank Herbert',
  genre: 'מדע בדיוני',
  pages: 412,
  status: 'reading',
  startDate: '2026-10-01',
  endDate: null,
  rating: null,
  review: null,
  summary: null,
};

function renderPage(route = '/book/b1') {
  return renderWithAuth(
    <Routes>
      <Route path="/book/:id" element={<BookPage />} />
      <Route path="/book/:id/edit" element={<p>edit-screen</p>} />
      <Route path="/" element={<p>shelf-screen</p>} />
    </Routes>,
    { route },
  );
}

beforeEach(() => {
  fixtures.book = { ...baseBook };
  fixtures.notes = [];
  fixtures.quotes = [];
});

describe('BookPage header and dates', () => {
  it('shows the book details, dates and reading day', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Dune' })).toBeInTheDocument();
    expect(screen.getByText('Frank Herbert')).toBeInTheDocument();
    expect(screen.getByText('מדע בדיוני · 412 עמודים')).toBeInTheDocument();
    expect(screen.getByText('01/10/2026')).toBeInTheDocument();
    expect(screen.getByText(/^יום \d+$/)).toBeInTheDocument();
  });

  it('shows "not found" for a missing book', () => {
    fixtures.book = null;
    renderPage();
    expect(screen.getByText('הספר לא נמצא.')).toBeInTheDocument();
  });

  it('shows reading days, rating and review for a finished book', () => {
    fixtures.book = {
      ...baseBook,
      status: 'finished',
      endDate: '2026-10-10',
      rating: 4,
      review: 'Spice must flow',
    };
    renderPage();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'דירוג 4 מתוך 5' })).toBeInTheDocument();
    expect(screen.getByText('Spice must flow')).toBeInTheDocument();
  });
});

describe('BookPage status actions', () => {
  it.each([
    ['reading', ['סיימתי', 'נטשתי']],
    ['want', ['מתחיל לקרוא']],
    ['abandoned', ['חזרה לקריאה']],
    ['finished', ['קריאה חוזרת']],
  ])('%s shows %j', (status, labels) => {
    fixtures.book = { ...baseBook, status, endDate: status === 'reading' || status === 'want' ? null : '2026-10-10' };
    renderPage();
    const all = ['סיימתי', 'נטשתי', 'מתחיל לקרוא', 'חזרה לקריאה', 'קריאה חוזרת'];
    for (const label of all) {
      const button = screen.queryByRole('button', { name: label });
      if (labels.includes(label)) expect(button).toBeInTheDocument();
      else expect(button).not.toBeInTheDocument();
    }
  });

  it('"סיימתי" opens the rating dialog and saves rating and review', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'סיימתי' }));
    const dialog = screen.getByRole('dialog', { name: 'סיימתי את הספר' });
    await userEvent.click(within(dialog).getByRole('button', { name: '5 כוכבים' }));
    await userEvent.type(within(dialog).getByRole('textbox'), 'Great');
    await userEvent.click(within(dialog).getByRole('button', { name: 'שמירה' }));
    expect(updateBook).toHaveBeenCalledWith(testUser.uid, 'b1', {
      status: 'finished',
      endDate: todayISO(),
      rating: 5,
      review: 'Great',
    });
  });

  it('"דלג" finishes without rating or review', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'סיימתי' }));
    await userEvent.click(screen.getByRole('button', { name: 'דלג' }));
    expect(updateBook).toHaveBeenCalledWith(testUser.uid, 'b1', {
      status: 'finished',
      endDate: todayISO(),
      rating: null,
    });
  });

  it('shows an error in the dialog for an end date before the start date', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'סיימתי' }));
    const dialog = screen.getByRole('dialog');
    const dateInput = dialog.querySelector('input[type="date"]');
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2026-09-01');
    await userEvent.click(within(dialog).getByRole('button', { name: 'שמירה' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('תאריך הסיום');
    expect(updateBook).not.toHaveBeenCalled();
  });

  it('"נטשתי" saves the reason', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'נטשתי' }));
    const dialog = screen.getByRole('dialog', { name: 'נטשתי את הספר' });
    await userEvent.type(within(dialog).getByRole('textbox'), 'Too slow');
    await userEvent.click(within(dialog).getByRole('button', { name: 'שמירה' }));
    expect(updateBook).toHaveBeenCalledWith(testUser.uid, 'b1', {
      status: 'abandoned',
      endDate: todayISO(),
      abandonReason: 'Too slow',
    });
  });

  it('"מתחיל לקרוא" starts a want book today', async () => {
    fixtures.book = { ...baseBook, status: 'want', startDate: null };
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'מתחיל לקרוא' }));
    expect(updateBook).toHaveBeenCalledWith(testUser.uid, 'b1', {
      status: 'reading',
      startDate: todayISO(),
    });
  });

  it('"קריאה חוזרת" asks for confirmation and keeps the review', async () => {
    fixtures.book = { ...baseBook, status: 'finished', endDate: '2026-10-10', rating: 4, review: 'r' };
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'קריאה חוזרת' }));
    await userEvent.click(screen.getByRole('button', { name: 'התחל שוב' }));
    expect(updateBook).toHaveBeenCalledWith(testUser.uid, 'b1', {
      status: 'reading',
      startDate: todayISO(),
      endDate: null,
      rating: null,
    });
  });
});

describe('BookPage notes and quotes', () => {
  it('adds a note from the quick-add field', async () => {
    renderPage();
    await userEvent.type(screen.getByRole('textbox', { name: 'נקודה חדשה' }), '  Fear is the mind-killer ');
    const notesSection = screen.getByRole('region', { name: /נקודות חשובות/ });
    await userEvent.click(within(notesSection).getByRole('button', { name: 'שמור' }));
    expect(addEntry).toHaveBeenCalledWith(testUser.uid, 'b1', 'notes', {
      text: 'Fear is the mind-killer',
    });
  });

  it('focuses the note field when opened with ?add=note', () => {
    renderPage('/book/b1?add=note');
    expect(screen.getByRole('textbox', { name: 'נקודה חדשה' })).toHaveFocus();
  });

  it('lists every note with its date and edits one', async () => {
    fixtures.notes = Array.from({ length: 30 }, (_, i) => ({
      id: `n${i}`,
      text: `note ${i}`,
      createdAt: new Date(2026, 9, 20),
    }));
    renderPage();
    const notesSection = screen.getByRole('region', { name: /נקודות חשובות/ });
    expect(within(notesSection).getAllByRole('listitem')).toHaveLength(30);
    expect(within(notesSection).getAllByText('20/10/2026')).toHaveLength(30);

    await userEvent.click(within(notesSection).getAllByRole('button', { name: 'עריכה' })[0]);
    const editBox = within(notesSection).getByRole('textbox', { name: 'עריכת טקסט' });
    await userEvent.clear(editBox);
    await userEvent.type(editBox, 'edited');
    await userEvent.click(within(notesSection).getByRole('button', { name: 'שמירה' }));
    expect(updateEntry).toHaveBeenCalledWith(testUser.uid, 'b1', 'notes', 'n0', { text: 'edited' });
  });

  it('deletes a note after confirmation', async () => {
    fixtures.notes = [{ id: 'n1', text: 'bye', createdAt: new Date() }];
    renderPage();
    const notesSection = screen.getByRole('region', { name: /נקודות חשובות/ });
    await userEvent.click(within(notesSection).getByRole('button', { name: 'מחיקה' }));
    const dialog = screen.getByRole('dialog', { name: 'למחוק את הנקודה?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'מחיקה' }));
    expect(deleteEntry).toHaveBeenCalledWith(testUser.uid, 'b1', 'notes', 'n1');
  });

  it('adds quotes with and without a page', async () => {
    renderPage();
    const quotesSection = screen.getByRole('region', { name: /ציטוטים/ });
    await userEvent.type(within(quotesSection).getByRole('textbox', { name: 'ציטוט חדש' }), 'Q1');
    await userEvent.type(within(quotesSection).getByRole('spinbutton', { name: 'עמוד' }), '42');
    await userEvent.click(within(quotesSection).getByRole('button', { name: 'שמור' }));
    expect(addEntry).toHaveBeenLastCalledWith(testUser.uid, 'b1', 'quotes', { text: 'Q1', page: 42 });

    await userEvent.type(within(quotesSection).getByRole('textbox', { name: 'ציטוט חדש' }), 'Q2');
    await userEvent.click(within(quotesSection).getByRole('button', { name: 'שמור' }));
    expect(addEntry).toHaveBeenLastCalledWith(testUser.uid, 'b1', 'quotes', { text: 'Q2', page: null });
  });

  it('shows the page of a quote', () => {
    fixtures.quotes = [{ id: 'q1', text: 'quoted', page: 7, createdAt: new Date(2026, 9, 1) }];
    renderPage();
    expect(screen.getByText("01/10/2026 · עמ' 7")).toBeInTheDocument();
  });
});

describe('BookPage summary and menu', () => {
  it('edits the summary in place', async () => {
    renderPage();
    const section = screen.getByRole('region', { name: 'על מה הספר' });
    await userEvent.click(within(section).getByRole('button', { name: 'הוספה' }));
    await userEvent.type(within(section).getByRole('textbox'), 'Desert planet');
    await userEvent.click(within(section).getByRole('button', { name: 'שמירה' }));
    expect(updateBook).toHaveBeenCalledWith(testUser.uid, 'b1', { summary: 'Desert planet' });
  });

  it('deletes the book only after confirmation and returns to the shelf', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'תפריט' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'מחיקת ספר' }));
    expect(deleteBook).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'למחוק את הספר?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'מחיקה' }));
    expect(deleteBook).toHaveBeenCalledWith(testUser.uid, 'b1');
    expect(await screen.findByText('shelf-screen')).toBeInTheDocument();
  });

  it('cancelling the delete dialog keeps the book', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'תפריט' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'מחיקת ספר' }));
    await userEvent.click(screen.getByRole('button', { name: 'ביטול' }));
    expect(deleteBook).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('links to the edit screen', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'תפריט' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'עריכת פרטים' }));
    expect(screen.getByText('edit-screen')).toBeInTheDocument();
  });
});
