import { useMemo, useState } from 'react';
import { useBooks } from '../hooks/useBooks';
import { todayISO } from '../lib/dates';
import {
  STATS_RANGES,
  STATS_RANGE_LABELS,
  booksPerPeriod,
  genreDistribution,
  statsRange,
  summarize,
  topRated,
} from '../lib/stats';
import BooksPerPeriodChart from '../components/BooksPerPeriodChart';
import GenreChart from '../components/GenreChart';
import StatTile from '../components/StatTile';
import TopRatedList from '../components/TopRatedList';

export default function Stats() {
  const { data: books, loading, error } = useBooks();
  const [rangeKey, setRangeKey] = useState(STATS_RANGES.THIS_YEAR);
  const today = todayISO();

  const stats = useMemo(() => {
    const range = statsRange(rangeKey, today);
    return {
      range,
      summary: summarize(books, range),
      periods: booksPerPeriod(books, range),
      genres: genreDistribution(books, range),
      top: topRated(books, range),
    };
  }, [books, rangeKey, today]);

  if (loading) return <p className="muted" role="status">טוען…</p>;
  if (error) return <p className="error-text" role="alert">לא ניתן לטעון את הנתונים.</p>;

  const { range, summary, periods, genres, top } = stats;
  const formatNumber = (value) => value.toLocaleString('he-IL');

  return (
    <section className="screen">
      <h2 className="screen-title">סטטיסטיקות</h2>

      <div className="range-picker" role="group" aria-label="טווח">
        {Object.values(STATS_RANGES).map((key) => (
          <button
            key={key}
            type="button"
            className={key === rangeKey ? 'range-button active' : 'range-button'}
            aria-pressed={key === rangeKey}
            onClick={() => setRangeKey(key)}
          >
            {STATS_RANGE_LABELS[key]}
          </button>
        ))}
      </div>

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
            title={range.year ? `ספרים לחודש · ${range.year}` : 'ספרים לשנה'}
            periodLabel={range.year ? 'חודש' : 'שנה'}
            data={periods}
          />
          <GenreChart data={genres} />
          <TopRatedList books={top} />
        </div>
      )}
    </section>
  );
}
