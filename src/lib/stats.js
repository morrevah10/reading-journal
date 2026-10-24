import { readingDays } from './readingDays';
import { STATUS } from './statusTransitions';

export const STATS_RANGES = {
  THIS_YEAR: 'this-year',
  LAST_YEAR: 'last-year',
  ALL: 'all',
};

export const STATS_RANGE_LABELS = {
  'this-year': 'השנה',
  'last-year': 'שנה שעברה',
  all: 'הכל',
};

export const MONTH_LABELS = [
  'ינו׳',
  'פבר׳',
  'מרץ',
  'אפר׳',
  'מאי',
  'יוני',
  'יולי',
  'אוג׳',
  'ספט׳',
  'אוק׳',
  'נוב׳',
  'דצמ׳',
];

export const NO_GENRE_LABEL = "ללא ז'אנר";
export const OTHER_GENRE_LABEL = 'אחר';

// { key, year, startDate, endDate }; "all" has null bounds and no year.
export function statsRange(key, today) {
  const year = Number(today.slice(0, 4));
  if (key === STATS_RANGES.ALL) return { key, year: null, startDate: null, endDate: null };
  const target = key === STATS_RANGES.LAST_YEAR ? year - 1 : year;
  return { key, year: target, startDate: `${target}-01-01`, endDate: `${target}-12-31` };
}

export function inRange(date, range) {
  if (!date) return false;
  if (!range.startDate) return true;
  return date >= range.startDate && date <= range.endDate;
}

// Books count by end date, and only when finished (see SPEC "חישובים").
function finishedIn(books, range) {
  return books.filter((book) => book.status === STATUS.FINISHED && inRange(book.endDate, range));
}

export function summarize(books, range) {
  const finished = finishedIn(books, range);
  const durations = finished
    .filter((book) => book.startDate && book.endDate)
    .map((book) => readingDays(book))
    .filter((days) => days !== null);

  return {
    finished: finished.length,
    pages: finished.reduce((sum, book) => sum + (book.pages || 0), 0),
    booksWithoutPages: finished.filter((book) => !book.pages).length,
    averageDays: durations.length
      ? Math.round(durations.reduce((sum, days) => sum + days, 0) / durations.length)
      : null,
    abandoned: books.filter(
      (book) => book.status === STATUS.ABANDONED && inRange(book.endDate, range),
    ).length,
  };
}

// Twelve entries, January first; months without books have count 0.
export function booksPerMonth(books, year) {
  const counts = new Array(12).fill(0);
  for (const book of finishedIn(books, { startDate: `${year}-01-01`, endDate: `${year}-12-31` })) {
    counts[Number(book.endDate.slice(5, 7)) - 1] += 1;
  }
  return MONTH_LABELS.map((label, index) => ({
    key: `${year}-${String(index + 1).padStart(2, '0')}`,
    label,
    count: counts[index],
  }));
}

// One entry per year from the first to the last finished book, including empty years.
export function booksPerYear(books) {
  const years = finishedIn(books, { startDate: null, endDate: null }).map((book) =>
    Number(book.endDate.slice(0, 4)),
  );
  if (years.length === 0) return [];
  const first = Math.min(...years);
  const last = Math.max(...years);
  const result = [];
  for (let year = first; year <= last; year += 1) {
    result.push({
      key: String(year),
      label: String(year),
      count: years.filter((y) => y === year).length,
    });
  }
  return result;
}

// Months for a single year, years for "all".
export function booksPerPeriod(books, range) {
  return range.year ? booksPerMonth(books, range.year) : booksPerYear(books);
}

// Largest first (ties by name). Past `maxGenres`, the rest fold into "אחר".
export function genreDistribution(books, range, maxGenres = 7) {
  const counts = new Map();
  for (const book of finishedIn(books, range)) {
    const genre = book.genre?.trim() || NO_GENRE_LABEL;
    counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  const sorted = [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre, 'he'));
  if (sorted.length <= maxGenres) return sorted;
  const rest = sorted.slice(maxGenres).reduce((sum, item) => sum + item.count, 0);
  return [...sorted.slice(0, maxGenres), { genre: OTHER_GENRE_LABEL, count: rest }];
}

// Highest rating first; ties go to the most recently finished book.
export function topRated(books, range, limit = 5) {
  return finishedIn(books, range)
    .filter((book) => book.rating)
    .sort((a, b) => b.rating - a.rating || (a.endDate < b.endDate ? 1 : a.endDate > b.endDate ? -1 : 0))
    .slice(0, limit);
}
