import { useState } from 'react';
import { todayISO } from '../lib/dates';
import Dialog from './Dialog';
import StarRating from './StarRating';

// Shown after "סיימתי": end date (defaults to today), optional rating and review, or skip.
// `initialReview` pre-fills a review kept from a previous read.
export function FinishDialog({ open, initialReview, onConfirm, onCancel, error }) {
  const [form, setForm] = useState({ date: todayISO(), rating: null, review: initialReview ?? '' });

  return (
    <Dialog open={open} title="סיימתי את הספר" onClose={onCancel}>
      <label className="field">
        <span className="field-label">תאריך סיום</span>
        <input
          type="date"
          max={todayISO()}
          value={form.date}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
        />
      </label>
      <div className="field">
        <span className="field-label">דירוג</span>
        <StarRating value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
      </div>
      <label className="field">
        <span className="field-label">ביקורת קצרה</span>
        <textarea
          rows={3}
          value={form.review}
          onChange={(event) => setForm({ ...form, review: event.target.value })}
        />
      </label>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn btn-primary" onClick={() => onConfirm(form)}>
          שמירה
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onConfirm({ date: form.date, rating: null, review: undefined })}
        >
          דלג
        </button>
      </div>
    </Dialog>
  );
}

// Shown after "נטשתי": date (defaults to today) and an optional reason.
export function AbandonDialog({ open, onConfirm, onCancel, error }) {
  const [form, setForm] = useState({ date: todayISO(), reason: '' });

  return (
    <Dialog open={open} title="נטשתי את הספר" onClose={onCancel}>
      <label className="field">
        <span className="field-label">תאריך</span>
        <input
          type="date"
          max={todayISO()}
          value={form.date}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">סיבה (לא חובה)</span>
        <textarea
          rows={2}
          value={form.reason}
          onChange={(event) => setForm({ ...form, reason: event.target.value })}
        />
      </label>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn btn-primary" onClick={() => onConfirm(form)}>
          שמירה
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          ביטול
        </button>
      </div>
    </Dialog>
  );
}
