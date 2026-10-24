import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBook, useEntries } from '../hooks/useBooks';
import { deleteBook, updateBook } from '../firebase/books';
import { ENTRY_KINDS, addEntry, deleteEntry, updateEntry } from '../firebase/entries';
import { formatDate } from '../lib/dates';
import { readingDays } from '../lib/readingDays';
import {
  STATUS,
  STATUS_LABELS,
  TransitionError,
  applyTransition,
} from '../lib/statusTransitions';
import BookCover from '../components/BookCover';
import { ConfirmDialog } from '../components/Dialog';
import EditableText from '../components/EditableText';
import EntryList from '../components/EntryList';
import StarRating from '../components/StarRating';
import { AbandonDialog, FinishDialog } from '../components/StatusDialogs';

export default function BookPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user.uid;

  const { data: book, loading, error } = useBook(id);
  const notes = useEntries(id, ENTRY_KINDS.NOTES);
  const quotes = useEntries(id, ENTRY_KINDS.QUOTES);

  // Which dialog is open: 'finish' | 'abandon' | 'reread' | 'delete' | null.
  const [dialog, setDialog] = useState(null);
  const [dialogError, setDialogError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  if (loading || deleting) return <p className="muted" role="status">טוען…</p>;
  if (error) return <p className="error-text" role="alert">לא ניתן לטעון את הספר.</p>;
  if (!book) {
    return (
      <section className="screen">
        <p>הספר לא נמצא.</p>
        <Link to="/">חזרה למדף</Link>
      </section>
    );
  }

  function closeDialog() {
    setDialog(null);
    setDialogError('');
  }

  async function transition(action, options) {
    try {
      await updateBook(uid, id, applyTransition(book, action, options));
      closeDialog();
      setActionError('');
    } catch (err) {
      const message = err instanceof TransitionError ? err.message : 'הפעולה נכשלה. נסה שוב.';
      // Finish and abandon show errors inside their dialog; everything else below the buttons.
      if (dialog === 'finish' || dialog === 'abandon') {
        setDialogError(message);
      } else {
        closeDialog();
        setActionError(message);
      }
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteBook(uid, id);
      navigate('/', { replace: true });
    } catch {
      setDeleting(false);
      closeDialog();
      setActionError('המחיקה נכשלה. נסה שוב.');
    }
  }

  const days = readingDays(book);
  // Writes are not awaited: onSnapshot shows them immediately from the local cache.
  const reportFailure = () => setActionError('השמירה נכשלה. נסה שוב.');
  const entryHandlers = (kind) => ({
    onAdd: (entry) => addEntry(uid, id, kind, entry).catch(reportFailure),
    onUpdate: (entryId, patch) => updateEntry(uid, id, kind, entryId, patch).catch(reportFailure),
    onDelete: (entryId) => deleteEntry(uid, id, kind, entryId).catch(reportFailure),
  });

  return (
    <article className="screen book-page">
      <header className="book-header">
        <BookCover book={book} size="lg" />
        <div className="book-header-text">
          <h2 className="book-title">{book.title}</h2>
          {book.author && <p className="book-author">{book.author}</p>}
          <p className="muted">
            {[book.genre, book.pages && `${book.pages} עמודים`].filter(Boolean).join(' · ')}
          </p>
          <span className={`status-chip status-${book.status}`}>{STATUS_LABELS[book.status]}</span>
        </div>
        <div className="book-menu">
          <button
            type="button"
            className="icon-button"
            aria-label="תפריט"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              <Link role="menuitem" to={`/book/${id}/edit`} className="menu-item">
                עריכת פרטים
              </Link>
              <button
                type="button"
                role="menuitem"
                className="menu-item danger"
                onClick={() => {
                  setMenuOpen(false);
                  setDialog('delete');
                }}
              >
                מחיקת ספר
              </button>
            </div>
          )}
        </div>
      </header>

      <dl className="date-row">
        {book.startDate && (
          <div>
            <dt>התחלה</dt>
            <dd>{formatDate(book.startDate)}</dd>
          </div>
        )}
        {book.endDate && (
          <div>
            <dt>{book.status === STATUS.ABANDONED ? 'נטישה' : 'סיום'}</dt>
            <dd>{formatDate(book.endDate)}</dd>
          </div>
        )}
        {days && (
          <div>
            <dt>{book.status === STATUS.READING ? 'היום' : 'ימי קריאה'}</dt>
            <dd>{book.status === STATUS.READING ? `יום ${days}` : days}</dd>
          </div>
        )}
      </dl>

      <div className="action-buttons">
        {book.status === STATUS.READING && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => setDialog('finish')}>
              סיימתי
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setDialog('abandon')}>
              נטשתי
            </button>
          </>
        )}
        {book.status === STATUS.WANT && (
          <button type="button" className="btn btn-primary" onClick={() => transition('start')}>
            מתחיל לקרוא
          </button>
        )}
        {book.status === STATUS.ABANDONED && (
          <button type="button" className="btn btn-primary" onClick={() => transition('resume')}>
            חזרה לקריאה
          </button>
        )}
        {book.status === STATUS.FINISHED && (
          <button type="button" className="btn btn-secondary" onClick={() => setDialog('reread')}>
            קריאה חוזרת
          </button>
        )}
      </div>
      {actionError && (
        <p className="error-text" role="alert">
          {actionError}
        </p>
      )}

      {book.status === STATUS.FINISHED && (book.rating || book.review) && (
        <section className="card review-card" aria-label="דירוג וביקורת">
          <StarRating value={book.rating} />
          {book.review && <p className="pre-wrap">{book.review}</p>}
        </section>
      )}
      {book.status === STATUS.ABANDONED && book.abandonReason && (
        <section className="card review-card" aria-label="סיבת נטישה">
          <p className="pre-wrap">{book.abandonReason}</p>
        </section>
      )}

      <section className="book-section" aria-labelledby="summary-heading">
        <h3 id="summary-heading" className="section-title">
          על מה הספר
        </h3>
        <EditableText
          label="על מה הספר"
          value={book.summary}
          placeholder="עדיין לא נכתב תיאור."
          onSave={(summary) => updateBook(uid, id, { summary }).catch(reportFailure)}
        />
      </section>

      <EntryList
        kind={ENTRY_KINDS.NOTES}
        entries={notes.data}
        autoFocus={searchParams.get('add') === 'note'}
        {...entryHandlers(ENTRY_KINDS.NOTES)}
      />

      <EntryList
        kind={ENTRY_KINDS.QUOTES}
        entries={quotes.data}
        {...entryHandlers(ENTRY_KINDS.QUOTES)}
      />

      {dialog === 'finish' && (
        <FinishDialog
          open
          initialReview={book.review}
          error={dialogError}
          onCancel={closeDialog}
          onConfirm={({ date, rating, review }) => transition('finish', { date, rating, review })}
        />
      )}
      {dialog === 'abandon' && (
        <AbandonDialog
          open
          error={dialogError}
          onCancel={closeDialog}
          onConfirm={({ date, reason }) => transition('abandon', { date, reason })}
        />
      )}
      <ConfirmDialog
        open={dialog === 'reread'}
        title="קריאה חוזרת?"
        message="תאריך הסיום והדירוג יימחקו, ותאריך ההתחלה יהיה היום. הביקורת נשמרת."
        confirmLabel="התחל שוב"
        onConfirm={() => transition('reread')}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        title="למחוק את הספר?"
        message="הספר יימחק יחד עם כל הנקודות והציטוטים שלו. אי אפשר לבטל."
        confirmLabel="מחיקה"
        danger
        onConfirm={handleDelete}
        onCancel={closeDialog}
      />
    </article>
  );
}
