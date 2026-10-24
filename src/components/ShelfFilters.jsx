import { SHELF_STATUS } from '../lib/shelf';

export default function ShelfFilters({ value, onChange, genres, years }) {
  const set = (name) => (event) => onChange({ ...value, [name]: event.target.value });

  return (
    <div className="shelf-filters">
      <input
        type="search"
        className="shelf-search"
        aria-label="חיפוש לפי שם או סופר"
        placeholder="חיפוש לפי שם או סופר"
        value={value.query}
        onChange={set('query')}
      />
      <div className="shelf-selects">
        <select aria-label="סטטוס" value={value.status} onChange={set('status')}>
          <option value={SHELF_STATUS.FINISHED}>סיימתי</option>
          <option value={SHELF_STATUS.ABANDONED}>נטשתי</option>
          <option value={SHELF_STATUS.ALL}>הכל</option>
        </select>
        <select aria-label="ז'אנר" value={value.genre} onChange={set('genre')}>
          <option value="">כל הז'אנרים</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
        <select aria-label="שנה" value={value.year} onChange={set('year')}>
          <option value="">כל השנים</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
