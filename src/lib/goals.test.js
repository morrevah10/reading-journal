import { describe, expect, it } from 'vitest';
import {
  createGoal,
  daysLeft,
  goalDocId,
  goalPhase,
  goalProgress,
  groupGoals,
  nextPeriodStart,
  periodKey,
  periodRange,
  planRenewals,
  progressLabel,
  seriesToStop,
  validateGoal,
} from './goals';

const TODAY = '2026-10-24';

describe('periodRange', () => {
  it.each([
    ['2026-10-24', '2026-10-01', '2026-10-31'],
    ['2026-09-05', '2026-09-01', '2026-09-30'],
    ['2026-02-10', '2026-02-01', '2026-02-28'],
    ['2028-02-10', '2028-02-01', '2028-02-29'],
    ['2026-12-31', '2026-12-01', '2026-12-31'],
  ])('monthly range of %s', (date, startDate, endDate) => {
    expect(periodRange('monthly', date)).toEqual({ startDate, endDate });
  });

  it('yearly range', () => {
    expect(periodRange('yearly', TODAY)).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
  });
});

describe('periodKey / nextPeriodStart / goalDocId', () => {
  it('builds period keys', () => {
    expect(periodKey('monthly', TODAY)).toBe('2026-10');
    expect(periodKey('yearly', TODAY)).toBe('2026');
  });

  it('moves to the next period, across year ends', () => {
    expect(nextPeriodStart('monthly', '2026-10-01')).toBe('2026-11-01');
    expect(nextPeriodStart('monthly', '2026-12-01')).toBe('2027-01-01');
    expect(nextPeriodStart('yearly', '2026-01-01')).toBe('2027-01-01');
  });

  it('builds deterministic ids', () => {
    expect(goalDocId('monthly-books', 'monthly', '2026-11-01')).toBe('monthly-books__2026-11');
    expect(goalDocId('yearly-books', 'yearly', '2026-03-15')).toBe('yearly-books__2026');
  });
});

describe('goalPhase / daysLeft', () => {
  const october = { startDate: '2026-10-01', endDate: '2026-10-31' };

  it('active goal: days left include today', () => {
    expect(goalPhase(october, TODAY)).toBe('active');
    expect(daysLeft(october, TODAY)).toBe(8);
  });

  it('last day of the goal has 1 day left', () => {
    expect(goalPhase(october, '2026-10-31')).toBe('active');
    expect(daysLeft(october, '2026-10-31')).toBe(1);
  });

  it('first day is active', () => {
    expect(goalPhase(october, '2026-10-01')).toBe('active');
  });

  it('upcoming and ended goals', () => {
    expect(goalPhase(october, '2026-09-30')).toBe('upcoming');
    expect(goalPhase(october, '2026-11-01')).toBe('ended');
    expect(daysLeft(october, '2026-11-01')).toBe(0);
  });
});

describe('goalProgress', () => {
  const books = [
    { status: 'finished', endDate: '2026-10-01', pages: 300, genre: 'מתח' },
    { status: 'finished', endDate: '2026-10-31', pages: 200, genre: 'רומן' },
    { status: 'finished', endDate: '2026-10-15', pages: null, genre: 'מתח' },
    { status: 'finished', endDate: '2026-09-30', pages: 500, genre: 'מתח' },
    { status: 'finished', endDate: '2026-11-01', pages: 500, genre: 'מתח' },
    { status: 'abandoned', endDate: '2026-10-10', pages: 400, genre: 'מתח' },
    { status: 'reading', startDate: '2026-10-02', pages: 100, genre: 'מתח' },
  ];
  const range = { startDate: '2026-10-01', endDate: '2026-10-31' };

  it('books goal counts finished books inside the range, including both edges', () => {
    expect(goalProgress({ ...range, type: 'books', target: 5 }, books)).toMatchObject({
      current: 3,
      target: 5,
      percent: 60,
      achieved: false,
    });
  });

  it('never counts abandoned or reading books', () => {
    const progress = goalProgress({ ...range, type: 'books', target: 1 }, books.slice(5));
    expect(progress.current).toBe(0);
  });

  it('pages goal sums pages and reports books without pages', () => {
    expect(goalProgress({ ...range, type: 'pages', target: 1000 }, books)).toMatchObject({
      current: 500,
      percent: 50,
      booksWithoutPages: 1,
    });
  });

  it('genre goal counts only books of that genre', () => {
    expect(
      goalProgress({ ...range, type: 'genre', genre: 'מתח', target: 2 }, books),
    ).toMatchObject({ current: 2, achieved: true, percent: 100 });
  });

  it('caps the bar at 100% but keeps the real count', () => {
    const progress = goalProgress({ ...range, type: 'books', target: 2 }, books);
    expect(progress).toMatchObject({ current: 3, percent: 100, achieved: true });
    expect(progress.ratio).toBe(1.5);
  });

  it('formats labels', () => {
    expect(progressLabel({ type: 'books' }, { current: 3, target: 5 })).toBe('3 מתוך 5 ספרים');
    expect(progressLabel({ type: 'pages' }, { current: 820, target: 5000 })).toBe(
      '820 מתוך 5000 עמודים',
    );
    expect(progressLabel({ type: 'genre', genre: 'מתח' }, { current: 2, target: 4 })).toBe(
      '2 מתוך 4 ספרים במתח',
    );
  });
});

describe('createGoal / validateGoal', () => {
  it('monthly goals get the range of the current month', () => {
    const goal = createGoal(
      { name: ' Monthly ', type: 'books', target: '5', period: 'monthly', recurring: true, seriesId: 's1' },
      TODAY,
    );
    expect(goal).toEqual({
      name: 'Monthly',
      type: 'books',
      target: 5,
      genre: null,
      period: 'monthly',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      recurring: true,
      seriesId: 's1',
    });
    expect(validateGoal(goal)).toEqual({});
  });

  it('keeps the goal\'s own period when editing (periodDate)', () => {
    const goal = createGoal(
      { name: 'x', type: 'books', target: 1, period: 'monthly', periodDate: '2026-08-01' },
      TODAY,
    );
    expect(goal).toMatchObject({ startDate: '2026-08-01', endDate: '2026-08-31' });
  });

  it('generates a series id for a new recurring goal', () => {
    const goal = createGoal({ name: 'x', type: 'books', target: 1, period: 'yearly', recurring: true }, TODAY);
    expect(goal.seriesId).toMatch(/^goal-/);
  });

  it('custom goals use the given dates and never recur', () => {
    const goal = createGoal(
      { name: 'Summer', type: 'pages', target: '3000', period: 'custom', startDate: '2026-06-01', endDate: '2026-08-31', recurring: true },
      TODAY,
    );
    expect(goal).toMatchObject({ startDate: '2026-06-01', endDate: '2026-08-31', recurring: false });
    expect(validateGoal(goal)).toEqual({});
  });

  it('genre is kept only for genre goals', () => {
    expect(createGoal({ name: 'x', type: 'books', genre: 'מתח', target: 1, period: 'monthly' }, TODAY).genre)
      .toBeNull();
    expect(createGoal({ name: 'x', type: 'genre', genre: ' מתח ', target: 1, period: 'monthly' }, TODAY).genre)
      .toBe('מתח');
  });

  it.each([
    [{ name: '' }, 'name'],
    [{ target: 0 }, 'target'],
    [{ target: -2 }, 'target'],
    [{ target: null }, 'target'],
    [{ type: 'genre', genre: null }, 'genre'],
    [{ startDate: null }, 'startDate'],
    [{ endDate: null }, 'endDate'],
    [{ startDate: '2026-10-10', endDate: '2026-10-01' }, 'endDate'],
  ])('rejects %j', (override, field) => {
    const valid = {
      name: 'x',
      type: 'books',
      target: 1,
      genre: null,
      period: 'custom',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    };
    expect(validateGoal({ ...valid, ...override })).toHaveProperty(field);
  });

  it('allows goals in the future', () => {
    const goal = createGoal(
      { name: 'Next year', type: 'books', target: 10, period: 'custom', startDate: '2027-01-01', endDate: '2027-12-31' },
      TODAY,
    );
    expect(validateGoal(goal)).toEqual({});
  });
});

describe('planRenewals', () => {
  const monthly = (startDate, extra = {}) => ({
    id: goalDocId('monthly-books', 'monthly', startDate),
    name: 'יעד חודשי',
    type: 'books',
    target: 5,
    genre: null,
    period: 'monthly',
    ...periodRange('monthly', startDate),
    recurring: true,
    seriesId: 'monthly-books',
    ...extra,
  });

  it('does nothing when the current period exists', () => {
    expect(planRenewals([monthly('2026-09-01'), monthly('2026-10-01')], TODAY)).toEqual([]);
  });

  it('renews into the current period with the latest target', () => {
    const renewals = planRenewals(
      [monthly('2026-08-01', { target: 3 }), monthly('2026-09-01', { target: 7 })],
      TODAY,
    );
    expect(renewals).toEqual([
      {
        id: 'monthly-books__2026-10',
        data: expect.objectContaining({
          target: 7,
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          recurring: true,
          seriesId: 'monthly-books',
        }),
      },
    ]);
  });

  it('fills missed periods, across a year end', () => {
    const renewals = planRenewals([monthly('2025-11-01')], '2026-02-10');
    expect(renewals.map((r) => r.id)).toEqual([
      'monthly-books__2025-12',
      'monthly-books__2026-01',
      'monthly-books__2026-02',
    ]);
  });

  it('renews yearly goals', () => {
    const yearly = {
      id: 'yearly-books__2025',
      name: 'יעד שנתי',
      type: 'books',
      target: 30,
      period: 'yearly',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      recurring: true,
      seriesId: 'yearly-books',
    };
    expect(planRenewals([yearly], TODAY).map((r) => r.id)).toEqual(['yearly-books__2026']);
  });

  it('stops when the latest period is not recurring', () => {
    expect(planRenewals([monthly('2026-08-01'), monthly('2026-09-01', { recurring: false })], TODAY))
      .toEqual([]);
  });

  it('ignores non-recurring and custom goals', () => {
    expect(
      planRenewals(
        [
          { id: 'a', period: 'monthly', startDate: '2026-01-01', endDate: '2026-01-31', recurring: false },
          { id: 'b', period: 'custom', startDate: '2026-01-01', endDate: '2026-03-31', seriesId: 'x', recurring: true },
        ],
        TODAY,
      ),
    ).toEqual([]);
  });

  it('does not duplicate a period that already exists between gaps', () => {
    const renewals = planRenewals([monthly('2026-07-01'), monthly('2026-09-01', { id: 'monthly-books__2026-09' })], TODAY);
    expect(renewals.map((r) => r.id)).toEqual(['monthly-books__2026-10']);
  });
});

describe('seriesToStop', () => {
  it('returns other recurring periods of the same series', () => {
    const goals = [
      { id: 'a', seriesId: 's', recurring: true },
      { id: 'b', seriesId: 's', recurring: true },
      { id: 'c', seriesId: 's', recurring: false },
      { id: 'd', seriesId: 'other', recurring: true },
    ];
    expect(seriesToStop(goals, goals[1]).map((g) => g.id)).toEqual(['a']);
    expect(seriesToStop(goals, { id: 'x', seriesId: null })).toEqual([]);
  });
});

describe('groupGoals', () => {
  it('splits default, personal and history goals', () => {
    const goals = [
      { id: 'm-oct', seriesId: 'monthly-books', startDate: '2026-10-01', endDate: '2026-10-31' },
      { id: 'm-sep', seriesId: 'monthly-books', startDate: '2026-09-01', endDate: '2026-09-30' },
      { id: 'y-2026', seriesId: 'yearly-books', startDate: '2026-01-01', endDate: '2026-12-31' },
      { id: 'p-active', startDate: '2026-10-01', endDate: '2026-12-15' },
      { id: 'p-soon', startDate: '2026-10-20', endDate: '2026-11-01' },
      { id: 'p-upcoming', startDate: '2027-01-01', endDate: '2027-12-31' },
      { id: 'p-ended', startDate: '2026-01-01', endDate: '2026-03-31' },
    ];
    const groups = groupGoals(goals, TODAY);
    expect(groups.monthly.id).toBe('m-oct');
    expect(groups.yearly.id).toBe('y-2026');
    expect(groups.personal.map((g) => g.id)).toEqual(['p-soon', 'p-active', 'p-upcoming']);
    expect(groups.history.map((g) => g.id)).toEqual(['m-sep', 'p-ended']);
  });

  it('returns null defaults when not set up', () => {
    expect(groupGoals([], TODAY)).toEqual({ monthly: null, yearly: null, personal: [], history: [] });
  });
});
