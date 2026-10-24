// Builds the JSON export of all data (pure; reading lives in firebase/exportData.js).
// Firestore Timestamps become ISO strings, so the file is plain JSON. `version` allows a
// future import to recognize the format.

export const EXPORT_APP = 'reading-journal';
export const EXPORT_VERSION = 1;

// Converts Timestamps (anything with toDate()) and Dates to ISO strings, recursively.
export function toPlain(value) {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPlain(item)]));
  }
  return value;
}

// Oldest first, so the file reads in the order things were added.
const byCreatedAt = (a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''));

// `notes` and `quotes` map a book id to its entries; `genres` is the effective genre list.
export function buildExport({ books, notes = {}, quotes = {}, goals, genres }, now = new Date()) {
  const plainBooks = toPlain(books)
    .sort(byCreatedAt)
    .map((book) => ({
      ...book,
      notes: toPlain(notes[book.id] ?? []).sort(byCreatedAt),
      quotes: toPlain(quotes[book.id] ?? []).sort(byCreatedAt),
    }));
  return {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    counts: {
      books: plainBooks.length,
      notes: plainBooks.reduce((sum, book) => sum + book.notes.length, 0),
      quotes: plainBooks.reduce((sum, book) => sum + book.quotes.length, 0),
      goals: goals.length,
    },
    books: plainBooks,
    goals: toPlain(goals).sort(byCreatedAt),
    settings: { genres },
  };
}

export function exportToJson(data) {
  return JSON.stringify(data, null, 2);
}

// "reading-journal-2026-10-24.json"
export function exportFileName(todayIso) {
  return `${EXPORT_APP}-${todayIso}.json`;
}

// "35 KB" / "2.4 MB"
export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
