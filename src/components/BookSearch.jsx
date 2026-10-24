import { useEffect, useState } from 'react';
import { searchBooks } from '../api/googleBooks';

// Debounced Google Books search. Selecting a result calls `onSelect(result)`.
export default function BookSearch({ onSelect, debounceMs = 400 }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'idle', results: [] });

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setState({ status: 'idle', results: [] });
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState((prev) => ({ ...prev, status: 'loading' }));
      try {
        const results = await searchBooks(q, { signal: controller.signal });
        setState({ status: results.length ? 'done' : 'empty', results });
      } catch (error) {
        if (error?.name !== 'AbortError') setState({ status: 'error', results: [] });
      }
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, debounceMs]);

  function select(result) {
    onSelect(result);
    setQuery('');
  }

  return (
    <div className="book-search">
      <label className="field">
        <span className="field-label">חיפוש ב‑Google Books</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="שם הספר או הסופר"
          autoComplete="off"
        />
      </label>

      {state.status === 'loading' && <p className="muted">מחפש…</p>}
      {state.status === 'empty' && <p className="muted">לא נמצאו תוצאות. אפשר למלא ידנית.</p>}
      {state.status === 'error' && (
        <p className="error-text" role="alert">
          החיפוש נכשל. אפשר למלא ידנית.
        </p>
      )}

      {state.results.length > 0 && (
        <ul className="search-results" aria-label="תוצאות חיפוש">
          {state.results.map((result) => (
            <li key={result.googleId ?? result.title}>
              <button type="button" className="search-result" onClick={() => select(result)}>
                {result.thumbnailUrl ? (
                  <img src={result.thumbnailUrl} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="search-result-noimg" aria-hidden="true">📖</span>
                )}
                <span className="search-result-text">
                  <span className="search-result-title">{result.title}</span>
                  {result.author && <span className="muted">{result.author}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
