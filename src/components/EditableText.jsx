import { useState } from 'react';

// Text shown as a paragraph with an edit button; editing happens in place.
export default function EditableText({ label, value, placeholder, onSave }) {
  const [draft, setDraft] = useState(null);

  if (draft !== null) {
    return (
      <form
        className="editable-text"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft.trim() || null);
          setDraft(null);
        }}
      >
        <textarea
          rows={5}
          aria-label={label}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          autoFocus
        />
        <div className="entry-add-row">
          <button type="submit" className="btn btn-primary">
            שמירה
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>
            ביטול
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="editable-text">
      {value ? <p className="pre-wrap">{value}</p> : <p className="muted">{placeholder}</p>}
      <button type="button" className="link-button" onClick={() => setDraft(value ?? '')}>
        {value ? 'עריכה' : 'הוספה'}
      </button>
    </div>
  );
}
