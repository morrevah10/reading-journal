import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { addBook } from '../firebase/books';
import { SAVE_MODES, createBook, validateBook } from '../lib/bookModel';
import { todayISO } from '../lib/dates';
import BookForm from '../components/BookForm';
import BookSearch from '../components/BookSearch';

const EMPTY_FORM = {
  title: '',
  author: '',
  genre: '',
  pages: '',
  coverUrl: null,
  coverData: null,
  summary: '',
};

export default function NewBook() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...EMPTY_FORM, startDate: todayISO() });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  function handleSelect(result) {
    // Genre and summary the user already typed are kept.
    update({
      title: result.title,
      author: result.author ?? '',
      pages: result.pages ?? '',
      coverUrl: result.thumbnailUrl,
    });
    setErrors({});
  }

  async function save(mode) {
    const book = createBook(form, mode);
    const validation = validateBook(book);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSaving(true);
    setSaveError('');
    try {
      const id = await addBook(user.uid, book);
      navigate(`/book/${id}`, { replace: true });
    } catch {
      setSaveError('השמירה נכשלה. נסה שוב.');
      setSaving(false);
    }
  }

  return (
    <section className="screen">
      <h2 className="screen-title">ספר חדש</h2>

      <BookSearch onSelect={handleSelect} />

      <BookForm value={form} onChange={update} errors={errors} />

      <label className="field">
        <span className="field-label">תאריך התחלה (אם מתחיל עכשיו)</span>
        <input
          type="date"
          value={form.startDate}
          onChange={(event) => update({ startDate: event.target.value })}
        />
        {errors.startDate && <span className="error-text">{errors.startDate}</span>}
      </label>

      {saveError && (
        <p className="error-text" role="alert">
          {saveError}
        </p>
      )}

      <div className="save-buttons">
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={() => save(SAVE_MODES.START)}
        >
          מתחיל עכשיו
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={saving}
          onClick={() => save(SAVE_MODES.WANT)}
        >
          לרשימת רוצה לקרוא
        </button>
      </div>
    </section>
  );
}
