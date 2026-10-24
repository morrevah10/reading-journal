import { useEffect, useRef, useState } from 'react';
import { formatDate } from '../lib/dates';
import { ConfirmDialog } from './Dialog';

const TEXTS = {
  notes: {
    heading: 'נקודות חשובות',
    addLabel: 'נקודה חדשה',
    placeholder: 'מה חשוב לזכור?',
    empty: 'עדיין אין נקודות.',
    deleteTitle: 'למחוק את הנקודה?',
  },
  quotes: {
    heading: 'ציטוטים',
    addLabel: 'ציטוט חדש',
    placeholder: 'הציטוט',
    empty: 'עדיין אין ציטוטים.',
    deleteTitle: 'למחוק את הציטוט?',
  },
};

// Unlimited list of notes or quotes with quick add at the top, inline edit and delete.
// Quotes also have an optional page number.
export default function EntryList({ kind, entries, onAdd, onUpdate, onDelete, autoFocus = false }) {
  const texts = TEXTS[kind];
  const withPage = kind === 'quotes';
  const [draft, setDraft] = useState({ text: '', page: '' });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function handleAdd(event) {
    event.preventDefault();
    const entry = toEntry(draft, withPage);
    if (!entry) return;
    onAdd(entry);
    setDraft({ text: '', page: '' });
  }

  function handleSaveEdit(event) {
    event.preventDefault();
    const entry = toEntry(editing, withPage);
    if (!entry) return;
    onUpdate(editing.id, entry);
    setEditing(null);
  }

  return (
    <section className="entry-section" aria-labelledby={`${kind}-heading`}>
      <h3 id={`${kind}-heading`} className="section-title">
        {texts.heading} <span className="muted">({entries.length})</span>
      </h3>

      <form className="entry-add" onSubmit={handleAdd}>
        <textarea
          ref={inputRef}
          rows={2}
          aria-label={texts.addLabel}
          placeholder={texts.placeholder}
          value={draft.text}
          onChange={(event) => setDraft({ ...draft, text: event.target.value })}
        />
        <div className="entry-add-row">
          {withPage && (
            <input
              type="number"
              inputMode="numeric"
              min="1"
              aria-label="עמוד"
              placeholder="עמוד"
              className="page-input"
              value={draft.page}
              onChange={(event) => setDraft({ ...draft, page: event.target.value })}
            />
          )}
          <button type="submit" className="btn btn-primary" disabled={!draft.text.trim()}>
            שמור
          </button>
        </div>
      </form>

      {entries.length === 0 ? (
        <p className="muted">{texts.empty}</p>
      ) : (
        <ul className="entry-list">
          {entries.map((entry) =>
            editing?.id === entry.id ? (
              <li key={entry.id} className="entry">
                <form onSubmit={handleSaveEdit}>
                  <textarea
                    rows={3}
                    aria-label="עריכת טקסט"
                    value={editing.text}
                    onChange={(event) => setEditing({ ...editing, text: event.target.value })}
                  />
                  <div className="entry-add-row">
                    {withPage && (
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        aria-label="עריכת עמוד"
                        className="page-input"
                        value={editing.page}
                        onChange={(event) => setEditing({ ...editing, page: event.target.value })}
                      />
                    )}
                    <button type="submit" className="btn btn-primary" disabled={!editing.text.trim()}>
                      שמירה
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                      ביטול
                    </button>
                  </div>
                </form>
              </li>
            ) : (
              <li key={entry.id} className="entry">
                <p className={withPage ? 'entry-text entry-quote' : 'entry-text'}>{entry.text}</p>
                <div className="entry-meta">
                  <span className="muted">
                    {formatDate(entry.createdAt)}
                    {withPage && entry.page ? ` · עמ' ${entry.page}` : ''}
                  </span>
                  <span className="entry-buttons">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() =>
                        setEditing({ id: entry.id, text: entry.text, page: entry.page ?? '' })
                      }
                    >
                      עריכה
                    </button>
                    <button
                      type="button"
                      className="link-button danger"
                      onClick={() => setDeleting(entry.id)}
                    >
                      מחיקה
                    </button>
                  </span>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={texts.deleteTitle}
        confirmLabel="מחיקה"
        danger
        onConfirm={() => {
          onDelete(deleting);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </section>
  );
}

function toEntry({ text, page }, withPage) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!withPage) return { text: trimmed };
  const pageNumber = Number.parseInt(page, 10);
  return { text: trimmed, page: Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null };
}
