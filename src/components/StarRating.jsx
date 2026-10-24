const STARS = [1, 2, 3, 4, 5];

// Interactive when `onChange` is given; tapping the selected star again clears the rating.
export default function StarRating({ value = null, onChange, label = 'דירוג' }) {
  if (!onChange) {
    if (!value) return null;
    return (
      <span className="stars stars-readonly" role="img" aria-label={`דירוג ${value} מתוך 5`}>
        {STARS.map((star) => (
          <span key={star} className={star <= value ? 'star filled' : 'star'} aria-hidden="true">
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="stars" role="group" aria-label={label}>
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          className={star <= (value ?? 0) ? 'star filled' : 'star'}
          aria-label={`${star} כוכבים`}
          aria-pressed={value === star}
          onClick={() => onChange(value === star ? null : star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
