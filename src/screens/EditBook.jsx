import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBook } from '../hooks/useBooks';
import { updateBook } from '../firebase/books';
import { normalizeBookInput, validateBook } from '../lib/bookModel';
import { todayISO } from '../lib/dates';
import { STATUS } from '../lib/statusTransitions';
import BookForm from '../components/BookForm';
import StarRating from '../components/StarRating';

export default function EditBook() {
  const { id } = useParams();
  const { data: book, loading, error } = useBook(id);

  if (loading) return <p className="muted" role="status">טוען…</p>;
  if (error) return <p className="error-text" role="alert">לא ניתן לטעון את הספר.</p>;
  if (!book) {
    return (
      <section className="screen">
        <p>הספר לא נמצא.</p>
        <Link to="/">חזרה למדף</Link>
      </section>
    );
  }
  // Keyed so the form is initialized once per book.
  return <EditBookForm key={book.id} book={book} />;
}

function EditBookForm({ book }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => toForm(book));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const finished = book.status === STATUS.FINISHED;
  const abandoned = book.status === STATUS.ABANDONED;
  const hasEnd = finished || abandoned;

  async function handleSave(event) {
    event.preventDefault();
    const patch = {
      ...normalizeBookInput(form),
      startDate: form.startDate || null,
      ...(hasEnd && { endDate: form.endDate || null }),
      ...(finished && { rating: form.rating }),
    };
    const validation = validateBook({ ...book, ...patch });
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSaving(true);
    try {
      await updateBook(user.uid, book.id, patch);
      navigate(`/book/${book.id}`, { replace: true });
    } catch {
      setSaveError('השמירה נכשלה. נסה שוב.');
      setSaving(false);
    }
  }

  return (
    <form className="screen" onSubmit={handleSave}>
      <h2 className="screen-title">עריכת פרטים</h2>

      <BookForm value={form} onChange={update} errors={errors} />

      <div className="field-row">
        <label className="field">
          <span className="field-label">תאריך התחלה</span>
          <input
            type="date"
            max={todayISO()}
            value={form.startDate}
            onChange={(event) => update({ startDate: event.target.value })}
          />
          {errors.startDate && <span className="error-text">{errors.startDate}</span>}
        </label>
        {hasEnd && (
          <label className="field">
            <span className="field-label">{abandoned ? 'תאריך נטישה' : 'תאריך סיום'}</span>
            <input
              type="date"
              max={todayISO()}
              value={form.endDate}
              onChange={(event) => update({ endDate: event.target.value })}
            />
            {errors.endDate && <span className="error-text">{errors.endDate}</span>}
          </label>
        )}
      </div>

      {finished && (
        <>
          <div className="field">
            <span className="field-label">דירוג</span>
            <StarRating value={form.rating} onChange={(rating) => update({ rating })} />
          </div>
          <label className="field">
            <span className="field-label">ביקורת</span>
            <textarea
              rows={3}
              value={form.review}
              onChange={(event) => update({ review: event.target.value })}
            />
          </label>
        </>
      )}

      {abandoned && (
        <label className="field">
          <span className="field-label">סיבת נטישה</span>
          <textarea
            rows={2}
            value={form.abandonReason}
            onChange={(event) => update({ abandonReason: event.target.value })}
          />
        </label>
      )}

      {saveError && (
        <p className="error-text" role="alert">
          {saveError}
        </p>
      )}

      <div className="save-buttons">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          שמירה
        </button>
        <Link to={`/book/${book.id}`} className="btn btn-ghost">
          ביטול
        </Link>
      </div>
    </form>
  );
}

function toForm(book) {
  return {
    title: book.title ?? '',
    author: book.author ?? '',
    genre: book.genre ?? '',
    pages: book.pages ?? '',
    coverUrl: book.coverUrl ?? null,
    coverData: book.coverData ?? null,
    summary: book.summary ?? '',
    startDate: book.startDate ?? '',
    endDate: book.endDate ?? '',
    rating: book.rating ?? null,
    review: book.review ?? '',
    abandonReason: book.abandonReason ?? '',
  };
}
