import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithAuth } from '../test/renderWithAuth';
import Stats from './Stats';

const fixtures = vi.hoisted(() => ({ books: [] }));

vi.mock('../firebase/books', () => ({
  subscribeBooks: vi.fn((uid, onData) => {
    onData(fixtures.books);
    return () => {};
  }),
}));

const books = [
  { id: 'b1', status: 'finished', title: 'Dune', genre: 'מדע בדיוני', pages: 400, rating: 5, startDate: '2026-01-01', endDate: '2026-01-10' },
  { id: 'b2', status: 'finished', title: 'Gone Girl', genre: 'מתח', pages: 300, rating: 4, startDate: '2026-10-01', endDate: '2026-10-20' },
  { id: 'b3', status: 'finished', title: 'Foundation', genre: 'מדע בדיוני', pages: null, rating: null, endDate: '2026-10-22' },
  { id: 'b4', status: 'abandoned', title: 'Ulysses', startDate: '2026-03-01', endDate: '2026-03-05' },
  { id: 'b5', status: 'finished', title: 'Old One', genre: 'רומן', pages: 250, rating: 3, startDate: '2025-05-01', endDate: '2025-05-11' },
  { id: 'b6', status: 'reading', title: 'Now', startDate: '2026-10-15', pages: 900 },
];

function renderStats() {
  return renderWithAuth(
    <Routes>
      <Route path="/stats" element={<Stats />} />
      <Route path="/book/:id" element={<p>book-page</p>} />
    </Routes>,
    { route: '/stats' },
  );
}

const tile = (label) => screen.getByText(label).closest('.stat-tile');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 24, 12));
  fixtures.books = books;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Stats', () => {
  it('opens on the current year with its key numbers', () => {
    renderStats();
    expect(screen.getByRole('button', { name: 'שנה' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: '2026' })).toBeInTheDocument();
    expect(within(tile('ספרים שסיימתי')).getByText('3')).toBeInTheDocument();
    expect(within(tile('עמודים')).getByText('700')).toBeInTheDocument();
    expect(within(tile('עמודים')).getByText('1 ספרים בלי מספר עמודים')).toBeInTheDocument();
    // Dune 10 days, Gone Girl 20 days → 15.
    expect(within(tile('ממוצע ימים לספר')).getByText('15')).toBeInTheDocument();
    expect(within(tile('ספרים שנטשתי')).getByText('1')).toBeInTheDocument();
  });

  it('pages between years and stops at the first year with books and at today', async () => {
    renderStats();
    const back = screen.getByRole('button', { name: 'השנה הקודמת' });
    const forward = screen.getByRole('button', { name: 'השנה הבאה' });
    expect(forward).toBeDisabled();
    await userEvent.click(back);
    expect(screen.getByRole('heading', { name: '2025' })).toBeInTheDocument();
    expect(within(tile('ספרים שסיימתי')).getByText('1')).toBeInTheDocument();
    expect(within(tile('ספרים שנטשתי')).getByText('0')).toBeInTheDocument();
    expect(back).toBeDisabled();
    await userEvent.click(forward);
    expect(screen.getByRole('heading', { name: '2026' })).toBeInTheDocument();
  });

  it('shows a month with books per week and pages between months', async () => {
    renderStats();
    await userEvent.click(screen.getByRole('button', { name: 'חודש' }));
    expect(screen.getByRole('heading', { name: 'אוקטובר 2026' })).toBeInTheDocument();
    expect(within(tile('ספרים שסיימתי')).getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'החודש הבא' })).toBeDisabled();

    const section = screen.getByRole('region', { name: 'ספרים לשבוע · אוקטובר 2026' });
    await userEvent.click(within(section).getByRole('button', { name: 'הצג כטבלה' }));
    expect(within(section).getByRole('row', { name: '15–21 1' })).toBeInTheDocument();
    expect(within(section).getByRole('row', { name: '22–28 1' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'החודש הקודם' }));
    expect(screen.getByRole('heading', { name: 'ספטמבר 2026' })).toBeInTheDocument();
    expect(screen.getByText('אין ספרים שסיימת בטווח הזה.')).toBeInTheDocument();
  });

  it('keeps each mode\'s place when switching modes', async () => {
    renderStats();
    await userEvent.click(screen.getByRole('button', { name: 'השנה הקודמת' }));
    await userEvent.click(screen.getByRole('button', { name: 'חודש' }));
    expect(screen.getByRole('heading', { name: 'אוקטובר 2026' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'שנה' }));
    expect(screen.getByRole('heading', { name: '2025' })).toBeInTheDocument();
  });

  it('shows everything for "all", without paging', async () => {
    renderStats();
    await userEvent.click(screen.getByRole('button', { name: 'הכל' }));
    expect(within(tile('ספרים שסיימתי')).getByText('4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ספרים לשנה' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'תקופה' })).not.toBeInTheDocument();
  });

  it('shows books per month as a table', async () => {
    renderStats();
    const section = screen.getByRole('region', { name: 'ספרים לחודש · 2026' });
    await userEvent.click(within(section).getByRole('button', { name: 'הצג כטבלה' }));
    const table = within(section).getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(13);
    expect(within(table).getByRole('row', { name: 'ינו׳ 1' })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: 'אוק׳ 2' })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: 'מרץ 0' })).toBeInTheDocument();
  });

  it('shows books per year for "all"', async () => {
    renderStats();
    await userEvent.click(screen.getByRole('button', { name: 'הכל' }));
    const section = screen.getByRole('region', { name: 'ספרים לשנה' });
    await userEvent.click(within(section).getByRole('button', { name: 'הצג כטבלה' }));
    expect(within(section).getByRole('row', { name: '2025 1' })).toBeInTheDocument();
    expect(within(section).getByRole('row', { name: '2026 3' })).toBeInTheDocument();
  });

  it('shows the genre distribution as a table, largest first', async () => {
    renderStats();
    const section = screen.getByRole('region', { name: "התפלגות ז'אנרים" });
    await userEvent.click(within(section).getByRole('button', { name: 'הצג כטבלה' }));
    const rows = within(section).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual(['מדע בדיוני2', 'מתח1']);
  });

  it('lists the top rated books with links to their pages', async () => {
    renderStats();
    const section = screen.getByRole('region', { name: 'הדירוג הגבוה ביותר' });
    const links = within(section).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining('Dune'),
      expect.stringContaining('Gone Girl'),
    ]);
    await userEvent.click(links[0]);
    expect(screen.getByText('book-page')).toBeInTheDocument();
  });

  it('shows an empty state when nothing was finished in the range', () => {
    fixtures.books = [books[3], books[5]];
    renderStats();
    expect(screen.getByText('אין ספרים שסיימת בטווח הזה.')).toBeInTheDocument();
    expect(within(tile('ממוצע ימים לספר')).getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: "התפלגות ז'אנרים" })).not.toBeInTheDocument();
  });
});
