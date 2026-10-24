import { daysBetween, todayISO } from './dates';
import { STATUS } from './statusTransitions';

// Inclusive reading days: endDate − startDate + 1, or today − startDate + 1 while reading.
// Returns null when there is no start date or the range is invalid.
export function readingDays(book, today = todayISO()) {
  if (!book?.startDate) return null;
  const end = book.status === STATUS.READING ? today : book.endDate;
  if (!end) return null;
  const days = daysBetween(book.startDate, end) + 1;
  return days > 0 ? days : null;
}
