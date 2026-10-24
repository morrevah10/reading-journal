import { useEffect, useRef, useState } from 'react';
import {
  canDownloadCover,
  googleCoverDownloadUrl,
  loadCoverData,
  openLibraryIsbnCoverUrl,
} from '../api/coverSources';
import { compressImageFile } from '../lib/coverImage';
import { automaticCoverUrls, firstWorkingCover } from '../lib/coverPipeline';
import BookCover from './BookCover';
import CoverChooser from './CoverChooser';

const NOT_FOUND_HINT = 'לא נמצאה כריכה. אפשר לצלם את הכריכה או להעלות תמונה.';

// Cover preview and the three ways to get a cover, all saved compressed in `coverData`:
// 1. automatically from `autoSource.result` (a chosen search result), when given;
// 2. the picker (CoverChooser), opened when step 1 finds nothing or with "חפש כריכה";
// 3. a photo from the camera or an uploaded image.
// `coverUrl` stays as a fallback link for display when a cover couldn't be saved.
export default function CoverPicker({ title, author, coverUrl, coverData, onChange, autoSource }) {
  const uploadRef = useRef(null);
  const cameraRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [busy, setBusy] = useState(false);
  const [finding, setFinding] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!autoSource) return undefined;
    let cancelled = false;
    const urls = automaticCoverUrls(autoSource.result, {
      toDownloadUrl: googleCoverDownloadUrl,
      isbnUrl: openLibraryIsbnCoverUrl,
      canDownload: (url) => canDownloadCover(url),
    });
    setError('');
    setHint('');
    setFinding(true);
    firstWorkingCover(urls, (url) => loadCoverData(url)).then((found) => {
      if (cancelled) return;
      setFinding(false);
      if (found) onChangeRef.current({ coverData: found.coverData });
      else setChooserOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [autoSource]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setHint('');
    setBusy(true);
    try {
      onChange({ coverData: await compressImageFile(file) });
    } catch (err) {
      setError(err.message || 'העלאת התמונה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  function handleChoose(patch) {
    setChooserOpen(false);
    setHint('');
    onChange(patch);
  }

  // Called from the picker's click handler, so opening the file dialog is allowed.
  function handleFallback(kind) {
    setChooserOpen(false);
    if (kind === 'camera') cameraRef.current?.click();
    else if (kind === 'upload') uploadRef.current?.click();
    else setHint(NOT_FOUND_HINT);
  }

  const hasCover = Boolean(coverData || coverUrl);
  const working = busy || finding;

  return (
    <div className="cover-picker">
      <BookCover book={{ title, coverUrl, coverData }} size="md" />
      <div className="cover-picker-actions">
        {finding && (
          <p className="muted" role="status">
            מחפש כריכה…
          </p>
        )}
        {busy && (
          <p className="muted" role="status">
            מעבד…
          </p>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setChooserOpen(true)}
          disabled={working || !title?.trim()}
        >
          {hasCover ? 'החלף כריכה' : 'חפש כריכה'}
        </button>
        <div className="cover-picker-row">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => cameraRef.current?.click()}
            disabled={working}
          >
            צלם כריכה
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => uploadRef.current?.click()}
            disabled={working}
          >
            העלה תמונה
          </button>
        </div>
        {hasCover && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onChange({ coverData: null, coverUrl: null })}
            disabled={working}
          >
            הסר כריכה
          </button>
        )}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          data-testid="cover-camera-input"
          onChange={handleFile}
        />
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          hidden
          data-testid="cover-file-input"
          onChange={handleFile}
        />
        {hint && <p className="muted">{hint}</p>}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </div>
      {chooserOpen && (
        <CoverChooser
          open
          title={title}
          author={author}
          onChoose={handleChoose}
          onFallback={handleFallback}
          onClose={() => setChooserOpen(false)}
        />
      )}
    </div>
  );
}
