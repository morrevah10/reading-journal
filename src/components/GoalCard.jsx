import { formatDate } from '../lib/dates';
import { GOAL_PHASES, daysLeft, goalPhase, goalProgress, progressLabel } from '../lib/goals';

export default function GoalCard({ goal, books, today, title, onEdit, onDelete }) {
  const progress = goalProgress(goal, books);
  const phase = goalPhase(goal, today);
  const name = title ?? goal.name;

  return (
    <article className={progress.achieved ? 'card goal-card achieved' : 'card goal-card'}>
      <header className="goal-card-header">
        <h3 className="card-title">{name}</h3>
        {progress.achieved && <span className="badge goal-achieved">הושג! 🎉</span>}
      </header>

      <p className="goal-progress-label">{progressLabel(goal, progress)}</p>
      <div
        className="progress"
        role="progressbar"
        aria-label={`התקדמות ${name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
      </div>

      <p className="muted goal-meta">
        {formatDate(goal.startDate)}–{formatDate(goal.endDate)}
        {' · '}
        {phaseText(goal, phase, today)}
        {goal.recurring && ' · מתחדש'}
      </p>
      {progress.booksWithoutPages > 0 && (
        <p className="muted goal-meta">{progress.booksWithoutPages} ספרים בלי מספר עמודים</p>
      )}

      {(onEdit || onDelete) && (
        <div className="goal-actions">
          {onEdit && (
            <button type="button" className="link-button" onClick={() => onEdit(goal)}>
              עריכה
            </button>
          )}
          {onDelete && (
            <button type="button" className="link-button danger" onClick={() => onDelete(goal)}>
              מחיקה
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function phaseText(goal, phase, today) {
  if (phase === GOAL_PHASES.UPCOMING) return `מתחיל ב‑${formatDate(goal.startDate)}`;
  if (phase === GOAL_PHASES.ENDED) return 'הסתיים';
  const days = daysLeft(goal, today);
  return days === 1 ? 'היום האחרון' : `נותרו ${days} ימים`;
}
