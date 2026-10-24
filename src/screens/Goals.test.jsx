import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithAuth, testUser } from '../test/renderWithAuth';
import { createRenewals, deleteGoal, saveNewGoal, updateGoal } from '../firebase/goals';
import Goals from './Goals';

const fixtures = vi.hoisted(() => ({ goals: [], books: [] }));

vi.mock('../firebase/goals', () => ({
  subscribeGoals: vi.fn((uid, onData) => {
    onData(fixtures.goals);
    return () => {};
  }),
  saveNewGoal: vi.fn(() => Promise.resolve('new-id')),
  updateGoal: vi.fn(() => Promise.resolve()),
  deleteGoal: vi.fn(() => Promise.resolve()),
  createRenewals: vi.fn(() => Promise.resolve()),
}));

vi.mock('../firebase/books', () => ({
  subscribeBooks: vi.fn((uid, onData) => {
    onData(fixtures.books);
    return () => {};
  }),
}));

const october = (extra = {}) => ({
  id: 'monthly-books__2026-10',
  name: 'יעד חודשי',
  type: 'books',
  target: 5,
  genre: null,
  period: 'monthly',
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  recurring: true,
  seriesId: 'monthly-books',
  ...extra,
});

const yearly = {
  id: 'yearly-books__2026',
  name: 'יעד שנתי',
  type: 'books',
  target: 2,
  genre: null,
  period: 'yearly',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  recurring: true,
  seriesId: 'yearly-books',
};

const books = [
  { id: 'b1', status: 'finished', endDate: '2026-10-05', pages: 300 },
  { id: 'b2', status: 'finished', endDate: '2026-10-20', pages: 200 },
  { id: 'b3', status: 'finished', endDate: '2026-03-01', pages: 100 },
  { id: 'b4', status: 'abandoned', endDate: '2026-10-10', pages: 100 },
];

beforeEach(() => {
  // Pin "today" to 24/10/2026; only Date is faked so user-event timers keep working.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 24, 12));
  fixtures.goals = [];
  fixtures.books = books;
});

afterEach(() => {
  vi.useRealTimers();
});

// The first card with this heading: default goals come before personal goals and history.
const card = (name) => screen.getAllByRole('heading', { name })[0].closest('article, form');

describe('Goals — default goals', () => {
  it('offers to set up the monthly and yearly goals', async () => {
    renderWithAuth(<Goals />);
    const monthlySetup = card('יעד חודשי');
    await userEvent.type(within(monthlySetup).getByRole('spinbutton'), '4');
    await userEvent.click(within(monthlySetup).getByRole('button', { name: 'הגדר יעד' }));
    expect(saveNewGoal).toHaveBeenCalledWith(testUser.uid, {
      name: 'יעד חודשי',
      type: 'books',
      target: 4,
      genre: null,
      period: 'monthly',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      recurring: true,
      seriesId: 'monthly-books',
    });
  });

  it('rejects an empty target in the setup', async () => {
    renderWithAuth(<Goals />);
    await userEvent.click(within(card('יעד שנתי')).getByRole('button', { name: 'הגדר יעד' }));
    expect(within(card('יעד שנתי')).getByText(/מספר שלם גדול מ/)).toBeInTheDocument();
    expect(saveNewGoal).not.toHaveBeenCalled();
  });

  it('shows progress from finished books in the period, days left and achieved', () => {
    fixtures.goals = [october(), yearly];
    renderWithAuth(<Goals />);
    const monthly = card('יעד חודשי');
    expect(within(monthly).getByText('2 מתוך 5 ספרים')).toBeInTheDocument();
    expect(within(monthly).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(within(monthly).getByText(/נותרו 8 ימים/)).toBeInTheDocument();
    expect(within(monthly).queryByText(/הושג/)).not.toBeInTheDocument();

    const year = card('יעד שנתי');
    expect(within(year).getByText('3 מתוך 2 ספרים')).toBeInTheDocument();
    expect(within(year).getByText(/הושג/)).toBeInTheDocument();
  });

  it('renews a recurring goal whose current period is missing', () => {
    fixtures.goals = [october({ id: 'monthly-books__2026-09', startDate: '2026-09-01', endDate: '2026-09-30', target: 6 })];
    renderWithAuth(<Goals />);
    expect(createRenewals).toHaveBeenCalledWith(testUser.uid, [
      expect.objectContaining({
        id: 'monthly-books__2026-10',
        data: expect.objectContaining({ target: 6, startDate: '2026-10-01' }),
      }),
    ]);
  });

  it('does not renew when the current period exists', () => {
    fixtures.goals = [october()];
    renderWithAuth(<Goals />);
    expect(createRenewals).not.toHaveBeenCalled();
  });
});

describe('Goals — personal goals and history', () => {
  it('creates a personal pages goal for a date range', async () => {
    renderWithAuth(<Goals />);
    await userEvent.click(screen.getByRole('button', { name: 'יעד חדש' }));
    const dialog = screen.getByRole('dialog', { name: 'יעד חדש' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'שם היעד *' }), 'Summer pages');
    await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: 'סוג' }), 'pages');
    await userEvent.type(within(dialog).getByRole('spinbutton', { name: 'כמות *' }), '3000');
    await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: 'תקופה' }), 'custom');
    await userEvent.type(within(dialog).getByLabelText('מתאריך *'), '2026-10-01');
    await userEvent.type(within(dialog).getByLabelText('עד תאריך *'), '2026-12-31');
    await userEvent.click(within(dialog).getByRole('button', { name: 'שמירה' }));

    expect(saveNewGoal).toHaveBeenCalledWith(testUser.uid, {
      name: 'Summer pages',
      type: 'pages',
      target: 3000,
      genre: null,
      period: 'custom',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      recurring: false,
      seriesId: null,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows validation errors and keeps the dialog open', async () => {
    renderWithAuth(<Goals />);
    await userEvent.click(screen.getByRole('button', { name: 'יעד חדש' }));
    await userEvent.click(screen.getByRole('button', { name: 'שמירה' }));
    expect(screen.getByText('שם היעד הוא שדה חובה')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(saveNewGoal).not.toHaveBeenCalled();
  });

  it('lists active personal goals, and ended goals under history', () => {
    fixtures.goals = [
      { id: 'p1', name: 'Fall', type: 'books', target: 3, period: 'custom', startDate: '2026-10-01', endDate: '2026-11-30', recurring: false },
      { id: 'p2', name: 'Spring', type: 'books', target: 1, period: 'custom', startDate: '2026-03-01', endDate: '2026-03-31', recurring: false },
    ];
    renderWithAuth(<Goals />);
    const personal = screen.getByRole('region', { name: 'יעדים אישיים' });
    expect(within(personal).getByText('Fall')).toBeInTheDocument();
    const history = screen.getByRole('region', { name: 'היסטוריית יעדים' });
    expect(within(history).getByText('Spring')).toBeInTheDocument();
    expect(within(history).getByText(/הסתיים/)).toBeInTheDocument();
    expect(within(history).getByText(/הושג/)).toBeInTheDocument();
  });

  it('edits a goal target', async () => {
    fixtures.goals = [october()];
    renderWithAuth(<Goals />);
    await userEvent.click(within(card('יעד חודשי')).getByRole('button', { name: 'עריכה' }));
    const dialog = screen.getByRole('dialog', { name: 'עריכת יעד' });
    expect(within(dialog).getByRole('combobox', { name: 'תקופה' })).toBeDisabled();
    const target = within(dialog).getByRole('spinbutton', { name: 'כמות *' });
    await userEvent.clear(target);
    await userEvent.type(target, '8');
    await userEvent.click(within(dialog).getByRole('button', { name: 'שמירה' }));
    expect(updateGoal).toHaveBeenCalledWith(
      testUser.uid,
      'monthly-books__2026-10',
      expect.objectContaining({ target: 8, startDate: '2026-10-01', seriesId: 'monthly-books', recurring: true }),
    );
  });

  it('deleting a recurring goal warns and stops the rest of the series', async () => {
    fixtures.goals = [
      october(),
      october({ id: 'monthly-books__2026-09', startDate: '2026-09-01', endDate: '2026-09-30' }),
    ];
    renderWithAuth(<Goals />);
    await userEvent.click(within(card('יעד חודשי')).getByRole('button', { name: 'מחיקה' }));
    const dialog = screen.getByRole('dialog', { name: 'למחוק את היעד?' });
    expect(dialog).toHaveTextContent('היעד יפסיק להתחדש');
    await userEvent.click(within(dialog).getByRole('button', { name: 'מחיקה' }));
    expect(deleteGoal).toHaveBeenCalledWith(testUser.uid, 'monthly-books__2026-10', [
      'monthly-books__2026-09',
    ]);
  });

  it('cancelling a delete keeps the goal', async () => {
    fixtures.goals = [october()];
    renderWithAuth(<Goals />);
    await userEvent.click(within(card('יעד חודשי')).getByRole('button', { name: 'מחיקה' }));
    await userEvent.click(screen.getByRole('button', { name: 'ביטול' }));
    expect(deleteGoal).not.toHaveBeenCalled();
  });
});
