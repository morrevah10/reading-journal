import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBooks } from '../hooks/useBooks';
import { deleteBook, updateBook } from '../firebase/books';
import { wantToReadBooks } from '../lib/shelf';
import { applyTransition } from '../lib/statusTransitions';
import BookCover from '../components/BookCover';
import { ConfirmDialog } from '../components/Dialog';
import Fab from '../components/Fab';

export default function WantToRead() {
  const { user } = useAuth();
  const { data: books, loading, error } = useBooks();
  const list = useMemo(() => wantToReadBooks(books), [books]);
  const [deleting, setDeleting] = useState(null);
  const [actionError, setActionError] = useState('');

  if (loading) return <p className="muted" role="status">טוען…</p>;
  if (error) return <p className="error-text" role="alert">לא ניתן לטעון את הספרים.</p>;

  function start(book) {
    setActionError('');
    // Not awaited: onSnapshot moves the book to the shelf as soon as the local write lands.
    updateBook(user.uid, book.id, applyTransition(book, 'start')).catch(() =>
      setActionError('הפעולה נכשלה. נסה שוב.'),
    );
  }

  function confirmDelete() {
    const book = deleting;
    setDeleting(null);
    deleteBook(user.uid, book.id).catch(() => setActionError('המחיקה נכשלה. נסה שוב.'));
  }

  return (
    <section className="screen">
      <h2 className="screen-title">רוצה לקרוא</h2>

      {actionError && (
        <p className="error-text" role="alert">
          {actionError}
        </p>
      )}

      {list.length === 0 ? (
        <p className="muted">הרשימה ריקה. ספר שתוסיף ל"רוצה לקרוא" יופיע כאן.</p>
      ) : (
        <ul className="want-list" aria-label="רשימת רוצה לקרוא">
          {list.map((book) => (
            <li key={book.id} className="want-item card">
              <Link to={`/book/${book.id}`} className="want-item-main">
                <BookCover book={book} size="sm" />
                <span className="want-item-text">
                  <span className="want-item-title">{book.title}</span>
                  {book.author && <span className="muted">{book.author}</span>}
                </span>
              </Link>
              <div className="want-item-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  aria-label={`מתחיל לקרוא את ${book.title}`}
                  onClick={() => start(book)}
                >
                  מתחיל לקרוא
                </button>
                <button
                  type="button"
                  className="link-button danger"
                  aria-label={`מחיקת ${book.title}`}
                  onClick={() => setDeleting(book)}
                >
                  מחיקה
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="למחוק את הספר?"
        message={deleting ? `"${deleting.title}" יימחק מהרשימה. אי אפשר לבטל.` : ''}
        confirmLabel="מחיקה"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

      <Fab to="/new" label="ספר חדש" />
    </section>
  );
}
