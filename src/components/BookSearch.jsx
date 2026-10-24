import { useEffect, useState } from 'react';
import { SEARCH_SOURCES, searchAllSources } from '../api/bookSearch';

const SOURCE_LABELS = {
  [SEARCH_SOURCES.GOOGLE]: 'Google',
  [SEARCH_SOURCES.NLI]: 'הספרייה הלאומית',
};

const FAILED_MESSAGES = {
  [SEARCH_SOURCES.GOOGLE]: 'Google Books לא זמין כרגע.',
  [SEARCH_SOURCES.NLI]: 'הספרייה הלאומית לא זמינה כרגע.',
};

// Debounced search in Google Books and the National Library of Israel.
// Selecting a result calls `onSelect(result)`.
export default function BookSearch({ onSelect, debounceMs = 400 }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'idle', results: [], failed: [] });

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setState({ status: 'idle', results: [], failed: [] });
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState((prev) => ({ ...prev, status: 'loading' }));
      try {
        const { results, failed } = await searchAllSources(q, { signal: controller.signal });
        setState({ status: results.length ? 'done' : 'empty', results, failed });
      } catch (error) {
        if (error?.name !== 'AbortError') setState({ status: 'error', results: [], failed: [] });
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
        <span className="field-label">חיפוש ספר</span>
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
      {state.status !== 'error' &&
        state.failed.map((source) => (
          <p key={source} className="muted search-note">
            {FAILED_MESSAGES[source]}
          </p>
        ))}

      {state.results.length > 0 && (
        <ul className="search-results" aria-label="תוצאות חיפוש">
          {state.results.map((result, index) => (
            <li key={result.id ?? `${result.title}-${index}`}>
              <button type="button" className="search-result" onClick={() => select(result)}>
                {result.thumbnailUrl ? (
                  <img src={result.thumbnailUrl} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="search-result-noimg" aria-hidden="true">📖</span>
                )}
                <span className="search-result-text">
                  <span className="search-result-title">{result.title}</span>
                  {(result.author || result.year) && (
                    <span className="muted">
                      {[result.author, result.year].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  <span className="source-tags">
                    {(result.sources ?? [result.source]).map((source) => (
                      <span key={source} className="source-tag">
                        {SOURCE_LABELS[source]}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
