import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { addBook } from '../firebase/books';
import { SAVE_MODES, createBook, validateBook } from '../lib/bookModel';
import { todayISO } from '../lib/dates';
import AlreadyReadFields from '../components/AlreadyReadFields';
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

// The end date starts empty on purpose, so a past book isn't saved with today's date by mistake.
const EMPTY_HISTORY = { startDate: '', endDate: '', rating: null, review: '' };

export default function NewBook() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = todayISO();
  const [form, setForm] = useState({ ...EMPTY_FORM, startDate: today });
  const [history, setHistory] = useState(EMPTY_HISTORY);
  const [alreadyRead, setAlreadyRead] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const updateHistory = (patch) => setHistory((prev) => ({ ...prev, ...patch }));

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
    const input = mode === SAVE_MODES.FINISHED ? { ...form, ...history } : form;
    const book = createBook(input, mode, today);
    const validation = validateBook(book, today);
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

  function toggleAlreadyRead(open) {
    setAlreadyRead(open);
    setErrors({});
  }

  return (
    <section className="screen">
      <h2 className="screen-title">ספר חדש</h2>

      <BookSearch onSelect={handleSelect} />

      <BookForm value={form} onChange={update} errors={errors} />

      {alreadyRead ? (
        <>
          <AlreadyReadFields
            value={history}
            onChange={updateHistory}
            errors={errors}
            maxDate={today}
          />
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
              onClick={() => save(SAVE_MODES.FINISHED)}
            >
              שמירה
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => toggleAlreadyRead(false)}>
              ביטול
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="field">
            <span className="field-label">תאריך התחלה (אם מתחיל עכשיו)</span>
            <input
              type="date"
              max={today}
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
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => toggleAlreadyRead(true)}
            >
              כבר קראתי
            </button>
          </div>
        </>
      )}
    </section>
  );
}
