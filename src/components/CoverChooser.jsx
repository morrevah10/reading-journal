import { useEffect, useState } from 'react';
import { isBridgeConfigured } from '../api/bridge';
import {
  canDownloadCover,
  editionCoverCandidates,
  loadCoverData,
  webCoverCandidates,
} from '../api/coverSources';
import { PICKER_CANDIDATES, isCoverShaped, pickCandidates, pickerView } from '../lib/coverPipeline';
import Dialog from './Dialog';

const NO_LOADS = { loaded: [], failed: [] };

// Step 2 of the cover flow: a picker of up to 6 covers (other editions + web images).
// Up to 12 candidates are loaded in hidden <img>s; those that fail, or that load but are
// not cover-shaped (icons, banners), are dropped and the first 6 that load are shown. Choosing one downloads and compresses it;
// `onChoose({ coverData, coverUrl })`. When nothing fits, `onFallback(kind)` hands over to
// the camera ('camera'), an upload ('upload') or the hint below the cover (no kind).
export default function CoverChooser({ open, title, author, onChoose, onFallback, onClose }) {
  const [state, setState] = useState({ status: 'loading', candidates: [] });
  const [loads, setLoads] = useState(NO_LOADS);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    setState({ status: 'loading', candidates: [] });
    setLoads(NO_LOADS);
    setError('');
    Promise.allSettled([
      editionCoverCandidates({ title, author }, options),
      isBridgeConfigured() ? webCoverCandidates({ title, author }, options) : [],
    ]).then(([editions, web]) => {
      if (controller.signal.aborted) return;
      const usable = (list) =>
        list.status === 'fulfilled' ? list.value.filter((c) => canDownloadCover(c.downloadUrl)) : [];
      const candidates = pickCandidates(usable(editions), usable(web), PICKER_CANDIDATES);
      setState({ status: candidates.length ? 'done' : 'empty', candidates });
    });
    return () => controller.abort();
  }, [open, title, author]);

  const settle = (key, outcome) =>
    setLoads((prev) =>
      prev.loaded.includes(key) || prev.failed.includes(key)
        ? prev
        : { ...prev, [outcome]: [...prev[outcome], key] },
    );

  async function choose(candidate) {
    setSaving(candidate.key);
    setError('');
    try {
      const coverData = await loadCoverData(candidate.downloadUrl, { sig: candidate.sig });
      onChoose({ coverData, coverUrl: candidate.previewUrl });
    } catch {
      setError('לא ניתן לשמור את התמונה הזו. נסה תמונה אחרת.');
    } finally {
      setSaving(null);
    }
  }

  const { visible, allFailed } = pickerView(state.candidates, loads);
  const pending = state.candidates.filter(
    (c) => !loads.loaded.includes(c.key) && !loads.failed.includes(c.key),
  );
  const nothingFound = state.status === 'empty' || allFailed;

  return (
    <Dialog open={open} title="בחירת כריכה" onClose={onClose}>
      {state.status === 'loading' && (
        <p className="muted" role="status">
          מחפש כריכות…
        </p>
      )}
      {state.status === 'done' && !allFailed && visible.length === 0 && (
        <p className="muted" role="status">
          טוען תמונות…
        </p>
      )}
      {nothingFound && (
        <div className="cover-chooser-empty">
          <p>לא נמצאו כריכות. אפשר לצלם או להעלות תמונה.</p>
          <div className="cover-picker-row">
            <button type="button" className="btn btn-primary" onClick={() => onFallback('camera')}>
              צלם כריכה
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => onFallback('upload')}>
              העלה תמונה
            </button>
          </div>
        </div>
      )}
      {visible.length > 0 && (
        <ul className="cover-choices" aria-label="כריכות לבחירה">
          {visible.map((candidate, index) => (
            <li key={candidate.key}>
              <button
                type="button"
                className="cover-choice"
                disabled={saving !== null}
                aria-busy={saving === candidate.key}
                onClick={() => choose(candidate)}
              >
                <img src={candidate.previewUrl} alt={`כריכה ${index + 1}`} referrerPolicy="no-referrer" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* Images still loading; each moves to the list above once it loads, or is dropped. */}
      <div hidden data-testid="cover-preload">
        {pending.map((candidate) => (
          <img
            key={candidate.key}
            src={candidate.previewUrl}
            alt=""
            referrerPolicy="no-referrer"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              settle(candidate.key, isCoverShaped(naturalWidth, naturalHeight) ? 'loaded' : 'failed');
            }}
            onError={() => settle(candidate.key, 'failed')}
          />
        ))}
      </div>
      {saving && (
        <p className="muted" role="status">
          שומר כריכה…
        </p>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        {!nothingFound && (
          <button type="button" className="btn btn-secondary" onClick={() => onFallback()}>
            צילום או העלאה
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          ביטול
        </button>
      </div>
    </Dialog>
  );
}
