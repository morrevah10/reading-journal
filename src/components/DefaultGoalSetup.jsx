import { useState } from 'react';

// Shown in place of the monthly/yearly card until a target is set.
export default function DefaultGoalSetup({ title, question, onSave }) {
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const value = Number.parseInt(target, 10);
    if (!Number.isInteger(value) || value < 1) {
      setError('הכמות חייבת להיות מספר שלם גדול מ‑0');
      return;
    }
    setError('');
    onSave(value);
  }

  return (
    <form className="card goal-card goal-setup" onSubmit={handleSubmit} noValidate>
      <h3 className="card-title">{title}</h3>
      <label className="field">
        <span className="field-label">{question}</span>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        />
        {error && <span className="error-text">{error}</span>}
      </label>
      <button type="submit" className="btn btn-primary btn-small">
        הגדר יעד
      </button>
    </form>
  );
}
