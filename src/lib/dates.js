// Formats a date as dd/MM/yyyy. Accepts a Date, an ISO string ("2026-10-24"),
// a timestamp in ms, or a Firestore Timestamp. Returns '' for missing or invalid input.
export function formatDate(value) {
  const date = toDate(value);
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value?.toDate === 'function') return value.toDate();

  let date;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // Date-only strings are parsed as local dates, not UTC, to avoid day shifts.
    const [y, m, d] = value.split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(value);
  }
  return Number.isNaN(date.getTime()) ? null : date;
}
