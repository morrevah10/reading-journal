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

// Book dates are stored as local date-only strings: "yyyy-MM-dd".
export function toISODate(value) {
  const date = toDate(value);
  if (!date) return null;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayISO(now = new Date()) {
  return toISODate(now);
}

// Calendar days from `from` to `to` (both "yyyy-MM-dd"); negative if `to` is earlier.
// Computed in UTC so daylight saving changes never shift the result.
export function daysBetween(from, to) {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
