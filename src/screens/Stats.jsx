import { useMemo, useState } from 'react';
import { useBooks } from '../hooks/useBooks';
import { todayISO } from '../lib/dates';
import {
  STATS_MODES,
  STATS_MODE_LABELS,
  anchorBounds,
  anchorFor,
  booksPerPeriod,
  genreDistribution,
  periodRange,
  periodTitle,
  shiftAnchor,
  summarize,
  topRated,
} from '../lib/stats';
import BooksPerPeriodChart from '../components/BooksPerPeriodChart';
import GenreChart from '../components/GenreChart';
import StatTile from '../components/StatTile';
import TopRatedList from '../components/TopRatedList';

const CHART_LABELS = {
  [STATS_MODES.MONTH]: { title: 'ספרים לשבוע', period: 'ימים' },
  [STATS_MODES.YEAR]: { title: 'ספרים לחודש', period: 'חודש' },
  [STATS_MODES.ALL]: { title: 'ספרים לשנה', period: 'שנה' },
};

export default function Stats() {
  const { data: books, loading, error } = useBooks();
  const today = todayISO();
  const [mode, setMode] = useState(STATS_MODES.YEAR);
  // One anchor per mode, so switching modes and back keeps the place.
  const [anchors, setAnchors] = useState(() => ({
    [STATS_MODES.MONTH]: anchorFor(STATS_MODES.MONTH, today),
    [STATS_MODES.YEAR]: anchorFor(STATS_MODES.YEAR, today),
  }));
  const anchor = anchors[mode] ?? null;

  const stats = useMemo(() => {
    const range = periodRange(mode, anchor);
    return {
      range,
      bounds: mode === STATS_MODES.ALL ? null : anchorBounds(mode, books, today),
      summary: summarize(books, range),
      periods: booksPerPeriod(books, range),
      genres: genreDistribution(books, range),
      top: topRated(books, range),
    };
  }, [books, mode, anchor, today]);

  if (loading) return <p className="muted" role="status">טוען…</p>;
  if (error) return <p className="error-text" role="alert">לא ניתן לטעון את הנתונים.</p>;

  const { range, bounds, summary, periods, genres, top } = stats;
  const formatNumber = (value) => value.toLocaleString('he-IL');
  const title = periodTitle(range);
  const canGoBack = bounds && anchor > bounds.first;
  const canGoForward = bounds && anchor < bounds.last;
  const move = (delta) =>
    setAnchors((current) => ({ ...current, [mode]: shiftAnchor(mode, current[mode], delta) }));

  return (
    <section className="screen">
      <h2 className="screen-title">סטטיסטיקות</h2>

      <div className="range-picker" role="group" aria-label="תצוגה">
        {Object.values(STATS_MODES).map((key) => (
          <button
            key={key}
            type="button"
            className={key === mode ? 'range-button active' : 'range-button'}
            aria-pressed={key === mode}
            onClick={() => setMode(key)}
          >
            {STATS_MODE_LABELS[key]}
          </button>
        ))}
      </div>

      {mode !== STATS_MODES.ALL && (
        <div className="period-nav" role="group" aria-label="תקופה">
          <button
            type="button"
            className="period-arrow"
            aria-label={mode === STATS_MODES.MONTH ? 'החודש הקודם' : 'השנה הקודמת'}
            disabled={!canGoBack}
            onClick={() => move(-1)}
          >
            ›
          </button>
          <h3 className="period-title" aria-live="polite">
            {title}
          </h3>
          <button
            type="button"
            className="period-arrow"
            aria-label={mode === STATS_MODES.MONTH ? 'החודש הבא' : 'השנה הבאה'}
            disabled={!canGoForward}
            onClick={() => move(1)}
          >
            ‹
          </button>
        </div>
      )}

      <div className="stat-tiles">
        <StatTile label="ספרים שסיימתי" value={formatNumber(summary.finished)} />
        <StatTile
          label="עמודים"
          value={formatNumber(summary.pages)}
          note={summary.booksWithoutPages > 0 ? `${summary.booksWithoutPages} ספרים בלי מספר עמודים` : null}
        />
        <StatTile
          label="ממוצע ימים לספר"
          value={summary.averageDays === null ? '—' : formatNumber(summary.averageDays)}
        />
        <StatTile label="ספרים שנטשתי" value={formatNumber(summary.abandoned)} />
      </div>

      {summary.finished === 0 ? (
        <p className="muted">אין ספרים שסיימת בטווח הזה.</p>
      ) : (
        <div className="stats-charts">
          <BooksPerPeriodChart
            title={
              mode === STATS_MODES.ALL
                ? CHART_LABELS[mode].title
                : `${CHART_LABELS[mode].title} · ${title}`
            }
            periodLabel={CHART_LABELS[mode].period}
            data={periods}
          />
          <GenreChart data={genres} />
          <TopRatedList books={top} />
        </div>
      )}
    </section>
  );
}
