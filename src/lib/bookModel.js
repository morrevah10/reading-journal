import { todayISO } from './dates';
import { STATUS, isValidRating } from './statusTransitions';

// How a new book is saved from the New Book screen.
export const SAVE_MODES = {
  START: 'start',
  WANT: 'want',
};

const TEXT_FIELDS = ['title', 'author', 'genre', 'summary', 'review', 'abandonReason'];

// Trims text fields (empty → null) and parses pages. Only fields present in `input` are returned.
export function normalizeBookInput(input) {
  const result = {};
  for (const field of TEXT_FIELDS) {
    if (field in input) result[field] = cleanText(input[field]);
  }
  if ('title' in input) result.title = result.title ?? '';
  if ('pages' in input) result.pages = parsePages(input.pages);
  if ('coverUrl' in input) result.coverUrl = input.coverUrl || null;
  if ('coverData' in input) result.coverData = input.coverData || null;
  return result;
}

export function createBook(input, mode, today = todayISO()) {
  const reading = mode === SAVE_MODES.START;
  return {
    title: '',
    author: null,
    genre: null,
    pages: null,
    coverUrl: null,
    coverData: null,
    summary: null,
    ...normalizeBookInput(input),
    status: reading ? STATUS.READING : STATUS.WANT,
    startDate: reading ? input.startDate || today : null,
    endDate: null,
    rating: null,
    review: null,
    abandonReason: null,
    tags: [],
  };
}

// Returns a map of field → Hebrew error message. Empty object means valid.
export function validateBook(book) {
  const errors = {};
  if (!book.title || !book.title.trim()) {
    errors.title = 'שם הספר הוא שדה חובה';
  }
  if (book.status === STATUS.READING && !book.startDate) {
    errors.startDate = 'תאריך התחלה הוא שדה חובה לספר בקריאה';
  }
  if ((book.status === STATUS.FINISHED || book.status === STATUS.ABANDONED) && !book.endDate) {
    errors.endDate = 'תאריך סיום הוא שדה חובה';
  }
  if (book.startDate && book.endDate && book.endDate < book.startDate) {
    errors.endDate = 'תאריך הסיום לא יכול להיות לפני תאריך ההתחלה';
  }
  if (book.rating !== null && book.rating !== undefined) {
    if (book.status !== STATUS.FINISHED) {
      errors.rating = 'דירוג אפשרי רק לספר שסיימת';
    } else if (!isValidRating(book.rating)) {
      errors.rating = 'הדירוג חייב להיות בין 1 ל‑5';
    }
  }
  return errors;
}

// The cover to display: an uploaded cover wins over the Google Books link.
export function coverSource(book) {
  return book?.coverData || book?.coverUrl || null;
}

function cleanText(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function parsePages(value) {
  const pages = Number.parseInt(value, 10);
  return Number.isInteger(pages) && pages > 0 ? pages : null;
}
