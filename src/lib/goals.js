import { daysBetween } from './dates';
import { STATUS } from './statusTransitions';

export const GOAL_TYPES = {
  BOOKS: 'books',
  PAGES: 'pages',
  GENRE: 'genre',
};

export const PERIODS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
};

export const GOAL_PHASES = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  ENDED: 'ended',
};

// The two default goals (books per month / per year) are recurring series with fixed ids.
export const DEFAULT_SERIES = {
  monthly: 'monthly-books',
  yearly: 'yearly-books',
};

export const DEFAULT_GOAL_NAMES = {
  monthly: 'יעד חודשי',
  yearly: 'יעד שנתי',
};

export const GOAL_TYPE_LABELS = {
  books: 'ספרים',
  pages: 'עמודים',
  genre: "ז'אנר",
};

export const PERIOD_LABELS = {
  monthly: 'חודשי',
  yearly: 'שנתי',
  custom: 'טווח תאריכים',
};

// Safety cap for filling missed periods (20 years of months).
const MAX_RENEWALS = 240;

// Start and end ("yyyy-MM-dd") of the month or year containing `date`.
export function periodRange(period, date) {
  const [year, month] = date.split('-').map(Number);
  if (period === PERIODS.YEARLY) {
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, '0');
  return { startDate: `${year}-${mm}-01`, endDate: `${year}-${mm}-${lastDay}` };
}

export function periodKey(period, date) {
  return period === PERIODS.YEARLY ? date.slice(0, 4) : date.slice(0, 7);
}

// First day of the period after the one starting at `startDate`.
export function nextPeriodStart(period, startDate) {
  const [year, month] = startDate.split('-').map(Number);
  if (period === PERIODS.YEARLY) return `${year + 1}-01-01`;
  return month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

// Deterministic document id for one period of a recurring goal, so renewals from
// several devices write the same document instead of creating duplicates.
export function goalDocId(seriesId, period, date) {
  return `${seriesId}__${periodKey(period, date)}`;
}

export function newSeriesId() {
  return `goal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function goalPhase(goal, today) {
  if (goal.startDate > today) return GOAL_PHASES.UPCOMING;
  if (goal.endDate < today) return GOAL_PHASES.ENDED;
  return GOAL_PHASES.ACTIVE;
}

// Days left including today: on 24/10 a goal ending 31/10 has 8 days left. 0 once ended.
export function daysLeft(goal, today) {
  if (goal.endDate < today) return 0;
  return daysBetween(today, goal.endDate) + 1;
}

// Progress counts only finished books whose end date falls inside the goal's range.
export function goalProgress(goal, books) {
  const counted = books.filter(
    (book) =>
      book.status === STATUS.FINISHED &&
      book.endDate &&
      book.endDate >= goal.startDate &&
      book.endDate <= goal.endDate &&
      (goal.type !== GOAL_TYPES.GENRE || book.genre === goal.genre),
  );
  const isPages = goal.type === GOAL_TYPES.PAGES;
  const current = isPages
    ? counted.reduce((sum, book) => sum + (book.pages || 0), 0)
    : counted.length;
  const ratio = goal.target > 0 ? current / goal.target : 0;
  return {
    current,
    target: goal.target,
    ratio,
    percent: Math.min(100, Math.round(ratio * 100)),
    achieved: current >= goal.target,
    booksWithoutPages: isPages ? counted.filter((book) => !book.pages).length : 0,
  };
}

// "3 מתוך 5 ספרים" / "820 מתוך 5000 עמודים" / "2 מתוך 4 ספרים במתח".
export function progressLabel(goal, progress) {
  const unit = goal.type === GOAL_TYPES.PAGES ? 'עמודים' : 'ספרים';
  const genre = goal.type === GOAL_TYPES.GENRE && goal.genre ? ` ב${goal.genre}` : '';
  return `${progress.current} מתוך ${progress.target} ${unit}${genre}`;
}

// Builds a goal document from form values. For monthly/yearly goals the range is the period
// containing `values.periodDate` (defaults to today), so editing keeps the goal's own period.
export function createGoal(values, today) {
  const period = values.period;
  const custom = period === PERIODS.CUSTOM;
  const recurring = !custom && Boolean(values.recurring);
  const range = custom
    ? { startDate: values.startDate || null, endDate: values.endDate || null }
    : periodRange(period, values.periodDate || today);
  const target = Number.parseInt(values.target, 10);

  return {
    name: values.name?.trim() ?? '',
    type: values.type,
    target: Number.isInteger(target) ? target : null,
    genre: values.type === GOAL_TYPES.GENRE ? values.genre?.trim() || null : null,
    period,
    ...range,
    recurring,
    seriesId: recurring ? values.seriesId || newSeriesId() : values.seriesId || null,
  };
}

// Returns a map of field → Hebrew error message. Empty object means valid.
export function validateGoal(goal) {
  const errors = {};
  if (!goal.name?.trim()) errors.name = 'שם היעד הוא שדה חובה';
  if (!Object.values(GOAL_TYPES).includes(goal.type)) errors.type = 'יש לבחור סוג יעד';
  if (!Number.isInteger(goal.target) || goal.target < 1) {
    errors.target = 'הכמות חייבת להיות מספר שלם גדול מ‑0';
  }
  if (goal.type === GOAL_TYPES.GENRE && !goal.genre) errors.genre = "יש לבחור ז'אנר";
  if (!Object.values(PERIODS).includes(goal.period)) errors.period = 'יש לבחור תקופה';
  if (!goal.startDate) errors.startDate = 'תאריך התחלה הוא שדה חובה';
  if (!goal.endDate) errors.endDate = 'תאריך סיום הוא שדה חובה';
  if (goal.startDate && goal.endDate && goal.endDate < goal.startDate) {
    errors.endDate = 'תאריך הסיום לא יכול להיות לפני תאריך ההתחלה';
  }
  return errors;
}

// For each recurring series whose latest period has ended, returns the documents to create
// for every period up to and including the current one (missed periods are filled too).
// Each entry is { id, data }. The latest period's target is copied forward.
export function planRenewals(goals, today) {
  const ids = new Set(goals.map((goal) => goal.id));
  const latestBySeries = new Map();
  for (const goal of goals) {
    if (!goal.seriesId || goal.period === PERIODS.CUSTOM) continue;
    const latest = latestBySeries.get(goal.seriesId);
    if (!latest || goal.startDate > latest.startDate) latestBySeries.set(goal.seriesId, goal);
  }

  const renewals = [];
  for (const latest of latestBySeries.values()) {
    if (!latest.recurring) continue;
    const currentStart = periodRange(latest.period, today).startDate;
    let start = nextPeriodStart(latest.period, latest.startDate);
    for (let i = 0; start <= currentStart && i < MAX_RENEWALS; i += 1) {
      const id = goalDocId(latest.seriesId, latest.period, start);
      if (!ids.has(id)) {
        renewals.push({
          id,
          data: {
            name: latest.name,
            type: latest.type,
            target: latest.target,
            genre: latest.genre ?? null,
            period: latest.period,
            ...periodRange(latest.period, start),
            recurring: true,
            seriesId: latest.seriesId,
          },
        });
      }
      start = nextPeriodStart(latest.period, start);
    }
  }
  return renewals;
}

// Other documents of the same series that still renew. Deleting a recurring goal turns
// these off, otherwise an earlier period would recreate the deleted one.
export function seriesToStop(goals, goal) {
  if (!goal.seriesId) return [];
  return goals.filter((g) => g.seriesId === goal.seriesId && g.id !== goal.id && g.recurring);
}

// Splits goals for the Goals screen: the current default monthly/yearly goal, other
// active or upcoming goals, and ended goals (history, newest first).
export function groupGoals(goals, today) {
  const findCurrent = (seriesId) =>
    goals.find((g) => g.seriesId === seriesId && goalPhase(g, today) === GOAL_PHASES.ACTIVE) ??
    null;
  const monthly = findCurrent(DEFAULT_SERIES.monthly);
  const yearly = findCurrent(DEFAULT_SERIES.yearly);

  const personal = goals
    .filter((g) => g !== monthly && g !== yearly && goalPhase(g, today) !== GOAL_PHASES.ENDED)
    .sort((a, b) => (a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0));
  const history = goals
    .filter((g) => goalPhase(g, today) === GOAL_PHASES.ENDED)
    .sort((a, b) => (a.endDate < b.endDate ? 1 : a.endDate > b.endDate ? -1 : 0));

  return { monthly, yearly, personal, history };
}
