import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithAuth } from '../test/renderWithAuth';
import Shelf from './Shelf';

const fixtures = vi.hoisted(() => ({ books: [] }));

// Keeps the real Firebase app from initializing (CI has no .env.local).
vi.mock('../firebase/config', () => ({ app: {}, auth: {}, db: {} }));

vi.mock('../firebase/books', () => ({
  subscribeBooks: vi.fn((uid, onData) => {
    onData(fixtures.books);
    return () => {};
  }),
}));

const books = [
  { id: 'r1', status: 'reading', title: 'Dune', author: 'Frank Herbert', startDate: '2026-10-01' },
  { id: 'w1', status: 'want', title: 'Wanted Book' },
  { id: 'f1', status: 'finished', title: 'Old Finished', genre: 'עיון', endDate: '2025-03-01' },
  { id: 'f2', status: 'finished', title: 'New Finished', genre: 'רומן', endDate: '2026-09-01' },
  { id: 'a1', status: 'abandoned', title: 'Gave Up', endDate: '2026-05-01' },
];

function renderShelf(route = '/') {
  return renderWithAuth(
    <Routes>
      <Route path="/" element={<Shelf />} />
      <Route path="/new" element={<p>new-book-screen</p>} />
      <Route path="/book/:id" element={<p>book-page</p>} />
    </Routes>,
    { route },
  );
}

const gridTitles = () =>
  within(screen.getByRole('region', { name: /סיימתי|נטשתי|כל הספרים/ }))
    .queryAllByRole('link')
    .map((link) => link.getAttribute('aria-label'));

beforeEach(() => {
  fixtures.books = books;
});

describe('Shelf', () => {
  it('shows reading books first as cards with the reading day and quick add', () => {
    renderShelf();
    const reading = screen.getByRole('region', { name: 'בקריאה עכשיו' });
    expect(within(reading).getByText('Dune')).toBeInTheDocument();
    expect(within(reading).getByText(/^יום \d+$/)).toBeInTheDocument();
    expect(within(reading).getByRole('link', { name: 'הוסף נקודה' })).toHaveAttribute(
      'href',
      '/book/r1?add=note',
    );
  });

  it('shows finished books in the grid, newest first, without want books', () => {
    renderShelf();
    expect(gridTitles()).toEqual(['New Finished', 'Old Finished']);
    expect(screen.queryByText('Wanted Book')).not.toBeInTheDocument();
  });

  it('filters by status', async () => {
    renderShelf();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'סטטוס' }), 'abandoned');
    expect(gridTitles()).toEqual(['Gave Up']);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'סטטוס' }), 'all');
    expect(gridTitles()).toEqual(['New Finished', 'Gave Up', 'Old Finished']);
  });

  it('filters by genre and year', async () => {
    renderShelf();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: "ז'אנר" }), 'עיון');
    expect(gridTitles()).toEqual(['Old Finished']);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: "ז'אנר" }), '');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'שנה' }), '2026');
    expect(gridTitles()).toEqual(['New Finished']);
  });

  it('searches by title or author', async () => {
    renderShelf();
    await userEvent.type(screen.getByRole('searchbox', { name: 'חיפוש לפי שם או סופר' }), 'new');
    expect(gridTitles()).toEqual(['New Finished']);
    expect(screen.queryByRole('region', { name: 'בקריאה עכשיו' })).not.toBeInTheDocument();
  });

  it('shows an empty state for an empty shelf', () => {
    fixtures.books = [];
    renderShelf();
    expect(screen.getByText('המדף ריק. התחל בהוספת ספר חדש.')).toBeInTheDocument();
  });

  it('the floating button opens the new book screen', async () => {
    renderShelf();
    await userEvent.click(screen.getByRole('link', { name: /ספר חדש/ }));
    expect(screen.getByText('new-book-screen')).toBeInTheDocument();
  });
});
