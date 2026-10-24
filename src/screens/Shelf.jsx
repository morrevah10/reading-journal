import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBooks } from '../hooks/useBooks';
import { readingDays } from '../lib/readingDays';
import {
  DEFAULT_SHELF_FILTERS,
  readingBooks,
  shelfBooks,
  shelfGenres,
  shelfYears,
} from '../lib/shelf';
import { STATUS } from '../lib/statusTransitions';
import BookCover from '../components/BookCover';
import Fab from '../components/Fab';
import ShelfFilters from '../components/ShelfFilters';

export default function Shelf() {
  const { data: books, loading, error } = useBooks();
  const [filters, setFilters] = useState(DEFAULT_SHELF_FILTERS);

  const reading = useMemo(() => readingBooks(books, filters.query), [books, filters.query]);
  const grid = useMemo(() => shelfBooks(books, filters), [books, filters]);
  const genres = useMemo(() => shelfGenres(books), [books]);
  const years = useMemo(() => shelfYears(books), [books]);

  if (loading) return <p className="muted" role="status">טוען…</p>;
  if (error) return <p className="error-text" role="alert">לא ניתן לטעון את הספרים.</p>;

  return (
    <section className="screen">
      <h2 className="screen-title">המדף שלי</h2>

      <ShelfFilters value={filters} onChange={setFilters} genres={genres} years={years} />

      {reading.length > 0 && (
        <section aria-labelledby="reading-heading" className="shelf-section">
          <h3 id="reading-heading" className="section-title">
            בקריאה עכשיו
          </h3>
          <ul className="reading-cards">
            {reading.map((book) => (
              <li key={book.id} className="reading-card card">
                <Link to={`/book/${book.id}`} className="reading-card-main">
                  <BookCover book={book} size="md" />
                  <span className="reading-card-text">
                    <span className="reading-card-title">{book.title}</span>
                    {book.author && <span className="muted">{book.author}</span>}
                    {readingDays(book) && <span className="badge">יום {readingDays(book)}</span>}
                  </span>
                </Link>
                <Link to={`/book/${book.id}?add=note`} className="btn btn-secondary btn-small">
                  הוסף נקודה
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="grid-heading" className="shelf-section">
        <h3 id="grid-heading" className="section-title">
          {filters.status === 'abandoned' ? 'נטשתי' : filters.status === 'all' ? 'כל הספרים' : 'סיימתי'}
        </h3>
        {grid.length === 0 ? (
          <p className="muted">
            {books.length === 0 ? 'המדף ריק. התחל בהוספת ספר חדש.' : 'אין ספרים שמתאימים לסינון.'}
          </p>
        ) : (
          <ul className="cover-grid">
            {grid.map((book) => (
              <li key={book.id}>
                <Link to={`/book/${book.id}`} className="cover-grid-item" aria-label={book.title}>
                  <BookCover book={book} size="fill" />
                  {book.status === STATUS.ABANDONED && <span className="cover-badge">נטשתי</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Fab to="/new" label="ספר חדש" />
    </section>
  );
}
