import { GOAL_TYPES } from './goals';

// The genre list: suggestions in the book and goal forms (free text is always allowed).
// It is saved in users/{uid}/settings/genres; until it is first changed, DEFAULT_GENRES is used.
// Books and goals store the genre name itself, so renaming a genre may also update them.

export const DEFAULT_GENRES = [
  'רומן',
  'מתח',
  'מדע בדיוני',
  'פנטזיה',
  'היסטוריה',
  'ביוגרפיה',
  'עיון',
  'פסיכולוגיה',
  'פילוסופיה',
  'מדע',
  'עסקים',
  'שירה',
  'ילדים ונוער',
  'קומיקס',
];

export const GENRE_ERRORS = {
  EMPTY: "יש להזין שם ז'אנר",
  EXISTS: "הז'אנר כבר קיים ברשימה",
};

// Trims and collapses inner whitespace.
export function normalizeGenre(name) {
  return (name ?? '').trim().replace(/\s+/g, ' ');
}

// Two names are the same genre when they differ only in whitespace or letter case.
const genreKey = (name) => normalizeGenre(name).toLocaleLowerCase();
export const sameGenre = (a, b) => genreKey(a) !== '' && genreKey(a) === genreKey(b);

// Alphabetical (Hebrew collation), without empty names or duplicates.
export function sortGenres(list) {
  const seen = new Set();
  const genres = [];
  for (const raw of list ?? []) {
    const name = normalizeGenre(raw);
    const key = genreKey(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    genres.push(name);
  }
  return genres.sort((a, b) => a.localeCompare(b, 'he'));
}

// `saved` is the stored list, or null when it was never saved.
export function genreListOrDefault(saved) {
  return sortGenres(Array.isArray(saved) ? saved : DEFAULT_GENRES);
}

export function findGenre(list, name) {
  return list.find((genre) => sameGenre(genre, name)) ?? null;
}

// Error message for a genre being added, or null.
export function validateGenreName(list, name) {
  if (!normalizeGenre(name)) return GENRE_ERRORS.EMPTY;
  if (findGenre(list, name)) return GENRE_ERRORS.EXISTS;
  return null;
}

export function addGenre(list, name) {
  return sortGenres([...list, name]);
}

export function removeGenre(list, name) {
  return sortGenres(list.filter((genre) => !sameGenre(genre, name)));
}

// Renaming to a name already in the list merges the two genres into that one.
// → { list, to, merged }, where `to` is the name books and goals should get.
export function renameGenre(list, from, to) {
  const existing = findGenre(list, to);
  const merged = Boolean(existing) && !sameGenre(existing, from);
  const target = merged ? existing : normalizeGenre(to);
  return { list: sortGenres([...removeGenre(list, from), target]), to: target, merged };
}

// Ids of the books and genre goals that use this genre.
export function genreUsage(name, books = [], goals = []) {
  return {
    bookIds: books.filter((book) => sameGenre(book.genre, name)).map((book) => book.id),
    goalIds: goals
      .filter((goal) => goal.type === GOAL_TYPES.GENRE && sameGenre(goal.genre, name))
      .map((goal) => goal.id),
  };
}

// Genres typed freely in books that are not in the list.
export function unlistedGenres(list, books = []) {
  return sortGenres(books.map((book) => book.genre)).filter((genre) => !findGenre(list, genre));
}

// Suggestions for forms: the list plus genres already used in books.
export function genreSuggestions(list, books = []) {
  return sortGenres([...list, ...books.map((book) => book.genre)]);
}
