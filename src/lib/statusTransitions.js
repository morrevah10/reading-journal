import { todayISO } from './dates';

export const STATUS = {
  WANT: 'want',
  READING: 'reading',
  FINISHED: 'finished',
  ABANDONED: 'abandoned',
};

export const STATUS_LABELS = {
  want: 'רוצה לקרוא',
  reading: 'בקריאה',
  finished: 'סיימתי',
  abandoned: 'נטשתי',
};

// Allowed transitions on an existing book (see SPEC "מעברי סטטוס מותרים").
export const ACTIONS = {
  start: { from: STATUS.WANT, to: STATUS.READING },
  finish: { from: STATUS.READING, to: STATUS.FINISHED },
  abandon: { from: STATUS.READING, to: STATUS.ABANDONED },
  resume: { from: STATUS.ABANDONED, to: STATUS.READING },
  reread: { from: STATUS.FINISHED, to: STATUS.READING },
};

export class TransitionError extends Error {}

export const FUTURE_DATE_MESSAGE = 'התאריך לא יכול להיות בעתיד';

export function availableActions(status) {
  return Object.keys(ACTIONS).filter((action) => ACTIONS[action].from === status);
}

// Returns the fields to update for `action`, or throws TransitionError.
// Options: today, date (overrides today for the relevant date), rating, review, reason.
export function applyTransition(book, action, options = {}) {
  const rule = ACTIONS[action];
  if (!rule) throw new TransitionError(`Unknown action: ${action}`);
  if (book.status !== rule.from) {
    throw new TransitionError(`Cannot ${action} a book with status ${book.status}`);
  }

  const { today = todayISO(), date } = options;
  const when = date || today;
  if (when > today) throw new TransitionError(FUTURE_DATE_MESSAGE);

  switch (action) {
    case 'start':
      return { status: rule.to, startDate: when };

    case 'finish': {
      assertEndDate(book.startDate, when);
      const rating = options.rating ?? null;
      if (rating !== null && !isValidRating(rating)) {
        throw new TransitionError('הדירוג חייב להיות בין 1 ל‑5');
      }
      const patch = { status: rule.to, endDate: when, rating };
      if (options.review !== undefined) patch.review = cleanText(options.review);
      return patch;
    }

    case 'abandon':
      assertEndDate(book.startDate, when);
      return { status: rule.to, endDate: when, abandonReason: cleanText(options.reason) };

    case 'resume':
      return { status: rule.to, endDate: null, abandonReason: null };

    case 'reread':
      // The review is kept on purpose; only the end date and rating are cleared.
      return { status: rule.to, startDate: when, endDate: null, rating: null };

    default:
      throw new TransitionError(`Unknown action: ${action}`);
  }
}

export function isValidRating(rating) {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

function assertEndDate(startDate, endDate) {
  if (startDate && endDate < startDate) {
    throw new TransitionError('תאריך הסיום לא יכול להיות לפני תאריך ההתחלה');
  }
}

function cleanText(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}
