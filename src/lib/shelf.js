import { STATUS } from './statusTransitions';

export const SHELF_STATUS = {
  FINISHED: 'finished',
  ABANDONED: 'abandoned',
  ALL: 'all',
};

export const DEFAULT_SHELF_FILTERS = {
  status: SHELF_STATUS.FINISHED,
  genre: '',
  year: '',
  query: '',
};

// Books currently being read, most recently started first.
export function readingBooks(books, query = '') {
  return books
    .filter((book) => book.status === STATUS.READING && matchesQuery(book, query))
    .sort((a, b) => compareDesc(a.startDate, b.startDate));
}

// Books in the cover grid (finished and/or abandoned), newest end date first.
export function shelfBooks(books, filters = DEFAULT_SHELF_FILTERS) {
  const { status, genre, year, query } = { ...DEFAULT_SHELF_FILTERS, ...filters };
  return books
    .filter((book) => matchesStatus(book, status))
    .filter((book) => !genre || book.genre === genre)
    .filter((book) => !year || yearOf(book) === String(year))
    .filter((book) => matchesQuery(book, query))
    .sort((a, b) => compareDesc(a.endDate, b.endDate));
}

// The want-to-read list, most recently added first. A book whose server timestamp
// hasn't arrived yet was just added, so it goes first.
export function wantToReadBooks(books) {
  return books
    .filter((book) => book.status === STATUS.WANT)
    .sort((a, b) => {
      const timeA = toMillis(a.createdAt) ?? Infinity;
      const timeB = toMillis(b.createdAt) ?? Infinity;
      if (timeA === timeB) return 0;
      return timeA < timeB ? 1 : -1;
    });
}

export function shelfYears(books) {
  const years = new Set(
    books.filter((book) => matchesStatus(book, SHELF_STATUS.ALL)).map(yearOf).filter(Boolean),
  );
  return [...years].sort().reverse();
}

export function shelfGenres(books) {
  const genres = new Set(books.map((book) => book.genre).filter(Boolean));
  return [...genres].sort((a, b) => a.localeCompare(b, 'he'));
}

export function matchesQuery(book, query) {
  const needle = query?.trim().toLowerCase();
  if (!needle) return true;
  return [book.title, book.author].some((value) => value?.toLowerCase().includes(needle));
}

function matchesStatus(book, status) {
  if (status === SHELF_STATUS.ALL) {
    return book.status === STATUS.FINISHED || book.status === STATUS.ABANDONED;
  }
  return book.status === status;
}

function yearOf(book) {
  return book.endDate ? book.endDate.slice(0, 4) : null;
}

// Accepts a Firestore Timestamp, a Date or ms; null when missing.
function toMillis(value) {
  if (value === null || value === undefined) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return typeof value === 'number' ? value : null;
}

// Descending by ISO date string; missing dates go last.
function compareDesc(a, b) {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? 1 : -1;
}
