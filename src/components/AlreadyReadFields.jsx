import StarRating from './StarRating';

// Fields for "כבר קראתי": end date (required), start date (optional), rating and review.
export default function AlreadyReadFields({ value, onChange, errors = {}, maxDate }) {
  return (
    <fieldset className="already-read">
      <legend className="field-label">פרטי הקריאה</legend>
      <div className="field-row">
        <label className="field">
          <span className="field-label">תאריך התחלה (לא חובה)</span>
          <input
            type="date"
            max={maxDate}
            value={value.startDate}
            onChange={(event) => onChange({ startDate: event.target.value })}
          />
          {errors.startDate && <span className="error-text">{errors.startDate}</span>}
        </label>
        <label className="field">
          <span className="field-label">תאריך סיום *</span>
          <input
            type="date"
            max={maxDate}
            value={value.endDate}
            aria-invalid={Boolean(errors.endDate)}
            onChange={(event) => onChange({ endDate: event.target.value })}
          />
          {errors.endDate && <span className="error-text">{errors.endDate}</span>}
        </label>
      </div>
      <div className="field">
        <span className="field-label">דירוג</span>
        <StarRating value={value.rating} onChange={(rating) => onChange({ rating })} />
        {errors.rating && <span className="error-text">{errors.rating}</span>}
      </div>
      <label className="field">
        <span className="field-label">ביקורת קצרה</span>
        <textarea
          rows={3}
          value={value.review}
          onChange={(event) => onChange({ review: event.target.value })}
        />
      </label>
    </fieldset>
  );
}
