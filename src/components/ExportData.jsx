import { useState } from 'react';
import { fetchAllData } from '../firebase/exportData';
import { useAuth } from '../hooks/useAuth';
import { todayISO } from '../lib/dates';
import {
  buildExport,
  exportFileName,
  exportToJson,
  formatFileSize,
} from '../lib/exportData';
import { genreListOrDefault } from '../lib/genres';
import { DELIVERY, deliverFile, deliveryMethod, makeFile } from '../platform/fileDelivery';

const DONE_TEXT = { shared: 'הקובץ שותף.', downloaded: 'הקובץ הורד.' };

// Settings card: exports all data to a JSON file, in two steps — prepare (reads everything),
// then share or download from a separate tap, since sharing needs a fresh user gesture.
export default function ExportData() {
  const uid = useAuth().user?.uid;
  const [state, setState] = useState({ status: 'idle' });

  async function prepare() {
    setState({ status: 'preparing' });
    try {
      const data = await fetchAllData(uid);
      const exported = buildExport({ ...data, genres: genreListOrDefault(data.genres) });
      const file = makeFile(exportToJson(exported), exportFileName(todayISO()));
      setState({ status: 'ready', file, counts: exported.counts, method: deliveryMethod(file) });
    } catch {
      setState({ status: 'error' });
    }
  }

  async function deliver() {
    const outcome = await deliverFile(state.file);
    setState({ ...state, done: DONE_TEXT[outcome] ?? '' });
  }

  const { counts } = state;

  return (
    <div className="card export-data">
      <h3 className="card-title">ייצוא נתונים</h3>
      <p className="muted">
        קובץ JSON עם כל הספרים (כולל הכריכות השמורות), הנקודות, הציטוטים, היעדים והז'אנרים.
      </p>

      {state.status === 'ready' ? (
        <>
          <p>
            {`${counts.books} ספרים, ${counts.notes} נקודות, ${counts.quotes} ציטוטים, ${counts.goals} יעדים · ${formatFileSize(state.file.size)}`}
          </p>
          <button type="button" className="btn btn-primary" onClick={deliver}>
            {state.method === DELIVERY.SHARE ? 'שתף את הקובץ' : 'הורד את הקובץ'}
          </button>
          {state.done && (
            <p className="muted" role="status">
              {state.done}
            </p>
          )}
        </>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          onClick={prepare}
          disabled={state.status === 'preparing'}
        >
          הכן קובץ ייצוא
        </button>
      )}

      {state.status === 'preparing' && (
        <p className="muted" role="status">
          מכין את הקובץ…
        </p>
      )}
      {state.status === 'error' && (
        <p className="error-text" role="alert">
          הייצוא נכשל. נסה שוב.
        </p>
      )}
    </div>
  );
}
