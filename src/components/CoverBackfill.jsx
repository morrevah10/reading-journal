import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  canDownloadCover,
  googleCoverDownloadUrl,
  loadCoverData,
  openLibraryIsbnCoverUrl,
} from '../api/coverSources';
import { updateBook } from '../firebase/books';
import { useAuth } from '../hooks/useAuth';
import { useBooks } from '../hooks/useBooks';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { backfillUrls, booksNeedingCovers, runBackfill } from '../lib/coverBackfill';

const urlHelpers = {
  toDownloadUrl: googleCoverDownloadUrl,
  isbnUrl: openLibraryIsbnCoverUrl,
  canDownload: (url) => canDownloadCover(url),
};

// Settings card: saves a compressed copy of every cover that is still only a link.
export default function CoverBackfill() {
  const uid = useAuth().user?.uid;
  const { data: books, loading } = useBooks();
  const online = useOnlineStatus();
  const stopRef = useRef(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const pending = booksNeedingCovers(books);
  const running = progress !== null && result === null;

  async function start() {
    stopRef.current = false;
    setResult(null);
    setProgress({ done: 0, total: pending.length, saved: 0, failed: 0 });
    const outcome = await runBackfill(pending, {
      urlsFor: (book) => backfillUrls(book, urlHelpers),
      load: (url) => loadCoverData(url),
      save: (book, coverData) => updateBook(uid, book.id, { coverData }),
      shouldStop: () => stopRef.current,
      onProgress: setProgress,
    });
    setResult(outcome);
  }

  return (
    <div className="card cover-backfill">
      <h3 className="card-title">כריכות</h3>
      <p className="muted">
        שומר עותק דחוס של כל כריכה בתוך הספר, כך שהכריכות יוצגו גם בלי רשת ולא יהיו תלויות באתרים
        אחרים.
      </p>

      {loading ? (
        <p className="muted" role="status">
          טוען…
        </p>
      ) : (
        <p>
          {pending.length
            ? `${pending.length} ספרים עם כריכה שעדיין לא נשמרה אצלך.`
            : 'כל הכריכות כבר שמורות אצלך.'}
        </p>
      )}

      {!online && <p className="muted">צריך חיבור לרשת כדי לשמור כריכות.</p>}

      {running ? (
        <>
          <p role="status">
            {`שומר כריכות: ${progress.done} מתוך ${progress.total}`}
          </p>
          <progress value={progress.done} max={progress.total} aria-label="התקדמות שמירת הכריכות" />
          <button type="button" className="btn btn-secondary" onClick={() => (stopRef.current = true)}>
            עצור
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          onClick={start}
          disabled={loading || !online || pending.length === 0}
        >
          שמור את כל הכריכות אצלי
        </button>
      )}

      {result && (
        <div className="backfill-result" role="status">
          <p>
            {`נשמרו ${result.saved} כריכות.`}
            {result.stopped && ' השמירה נעצרה.'}
          </p>
          {result.failed.length > 0 && (
            <>
              <p>{`לא נמצאה כריכה ל‑${result.failed.length} ספרים:`}</p>
              <ul className="backfill-failed">
                {result.failed.map((book) => (
                  <li key={book.id}>
                    <Link to={`/book/${book.id}`}>{book.title}</Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
