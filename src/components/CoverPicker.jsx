import { useRef, useState } from 'react';
import { compressImageFile } from '../lib/coverImage';
import BookCover from './BookCover';

// Cover preview plus manual upload. Uploads are compressed into `coverData`;
// a Google Books cover stays as `coverUrl` and is shown only when there is no upload.
export default function CoverPicker({ title, coverUrl, coverData, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      onChange({ coverData: await compressImageFile(file) });
    } catch (err) {
      setError(err.message || 'העלאת התמונה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  const hasCover = Boolean(coverData || coverUrl);

  return (
    <div className="cover-picker">
      <BookCover book={{ title, coverUrl, coverData }} size="md" />
      <div className="cover-picker-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? 'מעבד…' : 'העלה תמונה'}
        </button>
        {hasCover && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onChange(coverData ? { coverData: null } : { coverUrl: null })}
          >
            {coverData ? 'הסר תמונה שהועלתה' : 'הסר כריכה'}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          data-testid="cover-file-input"
          onChange={handleFile}
        />
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
