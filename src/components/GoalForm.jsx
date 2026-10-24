import { useId, useState } from 'react';
import { GOAL_TYPES, GOAL_TYPE_LABELS, PERIODS, PERIOD_LABELS } from '../lib/goals';
import Dialog from './Dialog';

const EMPTY_VALUES = {
  name: '',
  type: GOAL_TYPES.BOOKS,
  genre: '',
  target: '',
  period: PERIODS.MONTHLY,
  startDate: '',
  endDate: '',
  recurring: false,
};

// Create/edit dialog. `onSubmit(values)` returns an errors object (empty when saved).
// `lockPeriod` keeps the period fixed when editing one period of a recurring goal.
export default function GoalForm({ open, title, initial, genres = [], lockPeriod, onSubmit, onCancel }) {
  const genresId = useId();
  const [values, setValues] = useState(() => ({ ...EMPTY_VALUES, ...initial }));
  const [errors, setErrors] = useState({});
  const set = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  function handleSubmit(event) {
    event.preventDefault();
    setErrors(onSubmit(values) ?? {});
  }

  const custom = values.period === PERIODS.CUSTOM;

  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <form onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field-label">שם היעד *</span>
          <input type="text" value={values.name} onChange={set('name')} autoComplete="off" />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field-label">סוג</span>
            <select value={values.type} onChange={set('type')}>
              {Object.values(GOAL_TYPES).map((type) => (
                <option key={type} value={type}>
                  {GOAL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="field field-narrow">
            <span className="field-label">כמות *</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={values.target}
              onChange={set('target')}
            />
            {errors.target && <span className="error-text">{errors.target}</span>}
          </label>
        </div>

        {values.type === GOAL_TYPES.GENRE && (
          <label className="field">
            <span className="field-label">ז'אנר *</span>
            <input
              type="text"
              list={genresId}
              value={values.genre}
              onChange={set('genre')}
              autoComplete="off"
            />
            <datalist id={genresId}>
              {genres.map((genre) => (
                <option key={genre} value={genre} />
              ))}
            </datalist>
            {errors.genre && <span className="error-text">{errors.genre}</span>}
          </label>
        )}

        <label className="field">
          <span className="field-label">תקופה</span>
          <select value={values.period} onChange={set('period')} disabled={lockPeriod}>
            {Object.values(PERIODS).map((period) => (
              <option key={period} value={period}>
                {PERIOD_LABELS[period]}
              </option>
            ))}
          </select>
        </label>

        {custom ? (
          <div className="field-row">
            <label className="field">
              <span className="field-label">מתאריך *</span>
              <input type="date" value={values.startDate} onChange={set('startDate')} />
              {errors.startDate && <span className="error-text">{errors.startDate}</span>}
            </label>
            <label className="field">
              <span className="field-label">עד תאריך *</span>
              <input type="date" value={values.endDate} onChange={set('endDate')} />
              {errors.endDate && <span className="error-text">{errors.endDate}</span>}
            </label>
          </div>
        ) : (
          <label className="checkbox-field">
            <input type="checkbox" checked={values.recurring} onChange={set('recurring')} />
            <span>מתחדש כל תקופה</span>
          </label>
        )}

        {errors.save && (
          <p className="error-text" role="alert">
            {errors.save}
          </p>
        )}

        <div className="dialog-actions">
          <button type="submit" className="btn btn-primary">
            שמירה
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            ביטול
          </button>
        </div>
      </form>
    </Dialog>
  );
}
