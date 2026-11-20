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

export const MONTH_NAMES = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

export const STATS_MODES = {
  MONTH: 'month',
  YEAR: 'year',
  ALL: 'all',
};

export const STATS_MODE_LABELS = {
  month: 'חודש',
  year: 'שנה',
  all: 'הכל',
};

// { key, year, startDate, endDate }; "all" has null bounds and no year.
export function statsRange(key, today) {
  const year = Number(today.slice(0, 4));
  if (key === STATS_RANGES.ALL) return { key, year: null, startDate: null, endDate: null };
  const target = key === STATS_RANGES.LAST_YEAR ? year - 1 : year;
  return { key, year: target, startDate: `${target}-01-01`, endDate: `${target}-12-31` };
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// The anchor of a mode for a date: "YYYY-MM" for month, "YYYY" for year, null for all.
export function anchorFor(mode, date) {
  if (mode === STATS_MODES.MONTH) return date.slice(0, 7);
  if (mode === STATS_MODES.YEAR) return date.slice(0, 4);
  return null;
}

// Range of a period: { mode, anchor, year, month, startDate, endDate }.
// "all" has null bounds; month ranges carry `month` (1–12) as well as `year`.
export function periodRange(mode, anchor) {
  if (mode === STATS_MODES.ALL) {
    return { mode, anchor: null, year: null, month: null, startDate: null, endDate: null };
  }
  const year = Number(anchor.slice(0, 4));
  if (mode === STATS_MODES.YEAR) {
    return { mode, anchor, year, month: null, startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }
  const month = Number(anchor.slice(5, 7));
  const mm = String(month).padStart(2, '0');
  return {
    mode,
    anchor,
    year,
    month,
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${String(daysInMonth(year, month)).padStart(2, '0')}`,
  };
}

// Moves an anchor forward or back by `delta` periods.
export function shiftAnchor(mode, anchor, delta) {
  if (mode === STATS_MODES.YEAR) return String(Number(anchor) + delta);
  if (mode === STATS_MODES.MONTH) {
    const date = new Date(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)) - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  return null;
}

// "נובמבר 2026" or "2026"; "הכל" for all.
export function periodTitle(range) {
  if (range.mode === STATS_MODES.MONTH) return `${MONTH_NAMES[range.month - 1]} ${range.year}`;
  if (range.mode === STATS_MODES.YEAR) return String(range.year);
  return STATS_MODE_LABELS.all;
}

// Paging limits: back at least two years (further if there are older books),
// forward only up to today, so the arrows never reach the future.
export function anchorBounds(mode, books, today) {
  const dates = books
    .filter((book) => (book.status === STATUS.FINISHED || book.status === STATUS.ABANDONED) && book.endDate)
    .map((book) => book.endDate);
  const earliestBook = dates.length ? dates.reduce((min, d) => (d < min ? d : min)) : today;
  const twoYearsAgo = `${Number(today.slice(0, 4)) - 2}-01-01`;
  const earliest = earliestBook < twoYearsAgo ? earliestBook : twoYearsAgo;
  return { first: anchorFor(mode, earliest), last: anchorFor(mode, today) };
}

// Books per week of a month: weeks are 1–7, 8–14, 15–21, 22–28 and 29–end.
export function booksPerWeek(books, range) {
  const total = daysInMonth(range.year, range.month);
  const weeks = [];
  for (let start = 1; start <= total; start += 7) {
    const end = Math.min(start + 6, total);
    weeks.push({ key: `${range.anchor}-w${weeks.length + 1}`, label: `${start}–${end}`, start, end, count: 0 });
  }
  for (const book of finishedIn(books, range)) {
    const day = Number(book.endDate.slice(8, 10));
    const week = weeks.find((w) => day >= w.start && day <= w.end);
    if (week) week.count += 1;
  }
  return weeks.map(({ key, label, count }) => ({ key, label, count }));
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

// Weeks for a month, months for a year, years for "all".
export function booksPerPeriod(books, range) {
  if (range.month) return booksPerWeek(books, range);
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
