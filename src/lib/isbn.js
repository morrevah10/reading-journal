// ISBN helpers. ISBN-10 and ISBN-13 of the same book compare equal after toIsbn13().

export function cleanIsbn(value) {
  if (typeof value !== 'string') return null;
  const compact = value.replace(/[-\s]/g, '').toUpperCase();
  return /^(\d{13}|\d{9}[\dX])$/.test(compact) ? compact : null;
}

export function toIsbn13(value) {
  const isbn = cleanIsbn(value);
  if (!isbn) return null;
  if (isbn.length === 13) return isbn;
  const body = `978${isbn.slice(0, 9)}`;
  const sum = [...body].reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1), 0);
  return `${body}${(10 - (sum % 10)) % 10}`;
}
