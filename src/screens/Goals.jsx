import { useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useBooks } from '../hooks/useBooks';
import { useGoalRenewals, useGoals } from '../hooks/useGoals';
import { deleteGoal, saveNewGoal, updateGoal } from '../firebase/goals';
import { todayISO } from '../lib/dates';
import { useGenres } from '../hooks/useGenres';
import { genreSuggestions } from '../lib/genres';
import {
  DEFAULT_GOAL_NAMES,
  DEFAULT_SERIES,
  GOAL_TYPES,
  PERIODS,
  createGoal,
  groupGoals,
  seriesToStop,
  validateGoal,
} from '../lib/goals';
import { ConfirmDialog } from '../components/Dialog';
import DefaultGoalSetup from '../components/DefaultGoalSetup';
import GoalCard from '../components/GoalCard';
import GoalForm from '../components/GoalForm';

const DEFAULT_QUESTIONS = {
  monthly: 'כמה ספרים בחודש?',
  yearly: 'כמה ספרים בשנה?',
};

export default function Goals() {
  const { user } = useAuth();
  const uid = user.uid;
  const goalsState = useGoals();
  const booksState = useBooks();
  const goals = goalsState.data;
  const books = booksState.data;
  useGoalRenewals(goals, goalsState.loading);

  const today = todayISO();
  const groups = useMemo(() => groupGoals(goals, today), [goals, today]);
  const genreList = useGenres().list;
  const genres = useMemo(() => genreSuggestions(genreList, books), [genreList, books]);

  // { goal: null } creates a new goal; { goal } edits it.
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [actionError, setActionError] = useState('');

  if (goalsState.loading || booksState.loading) return <p className="muted" role="status">טוען…</p>;
  if (goalsState.error || booksState.error) {
    return <p className="error-text" role="alert">לא ניתן לטעון את היעדים.</p>;
  }

  const reportFailure = () => setActionError('השמירה נכשלה. נסה שוב.');

  function setupDefault(period, target) {
    setActionError('');
    const goal = createGoal(
      {
        name: DEFAULT_GOAL_NAMES[period],
        type: GOAL_TYPES.BOOKS,
        target,
        period,
        recurring: true,
        seriesId: DEFAULT_SERIES[period],
      },
      today,
    );
    saveNewGoal(uid, goal).catch(reportFailure);
  }

  function submitGoal(values) {
    const editing = form?.goal ?? null;
    const goal = createGoal(
      {
        ...values,
        // Editing keeps the goal's own month/year unless the period type changed.
        periodDate: editing && values.period === editing.period ? editing.startDate : today,
        seriesId: editing?.seriesId ?? null,
      },
      today,
    );
    const errors = validateGoal(goal);
    if (Object.keys(errors).length) return errors;

    setActionError('');
    const write = editing ? updateGoal(uid, editing.id, goal) : saveNewGoal(uid, goal);
    write.catch(reportFailure);
    setForm(null);
    return {};
  }

  function confirmDelete() {
    const goal = deleting;
    setDeleting(null);
    const stopIds = seriesToStop(goals, goal).map((g) => g.id);
    deleteGoal(uid, goal.id, stopIds).catch(() => setActionError('המחיקה נכשלה. נסה שוב.'));
  }

  const cardProps = {
    books,
    today,
    onEdit: (goal) => setForm({ goal }),
    onDelete: (goal) => setDeleting(goal),
  };

  const deletingRecurring =
    deleting && (deleting.recurring || seriesToStop(goals, deleting).length > 0);

  return (
    <section className="screen">
      <h2 className="screen-title">יעדים</h2>

      {actionError && (
        <p className="error-text" role="alert">
          {actionError}
        </p>
      )}

      <div className="default-goals">
        {['monthly', 'yearly'].map((period) =>
          groups[period] ? (
            <GoalCard key={period} goal={groups[period]} {...cardProps} />
          ) : (
            <DefaultGoalSetup
              key={period}
              title={DEFAULT_GOAL_NAMES[period]}
              question={DEFAULT_QUESTIONS[period]}
              onSave={(target) => setupDefault(period, target)}
            />
          ),
        )}
      </div>

      <section aria-labelledby="personal-goals-heading">
        <div className="section-header">
          <h3 id="personal-goals-heading" className="section-title">
            יעדים אישיים
          </h3>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => setForm({ goal: null })}
          >
            יעד חדש
          </button>
        </div>
        {groups.personal.length === 0 ? (
          <p className="muted">אין יעדים אישיים.</p>
        ) : (
          <div className="goal-list">
            {groups.personal.map((goal) => (
              <GoalCard key={goal.id} goal={goal} {...cardProps} />
            ))}
          </div>
        )}
      </section>

      {groups.history.length > 0 && (
        <section aria-labelledby="goal-history-heading">
          <h3 id="goal-history-heading" className="section-title">
            היסטוריית יעדים
          </h3>
          <div className="goal-list">
            {groups.history.map((goal) => (
              <GoalCard key={goal.id} goal={goal} {...cardProps} />
            ))}
          </div>
        </section>
      )}

      {form && (
        <GoalForm
          open
          title={form.goal ? 'עריכת יעד' : 'יעד חדש'}
          initial={form.goal ? toFormValues(form.goal) : undefined}
          lockPeriod={Boolean(form.goal?.recurring)}
          genres={genres}
          onSubmit={submitGoal}
          onCancel={() => setForm(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="למחוק את היעד?"
        message={
          deletingRecurring
            ? 'היעד יפסיק להתחדש. התקופות הקודמות נשמרות בהיסטוריה.'
            : 'אי אפשר לבטל את המחיקה.'
        }
        confirmLabel="מחיקה"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </section>
  );
}

function toFormValues(goal) {
  return {
    name: goal.name ?? '',
    type: goal.type,
    genre: goal.genre ?? '',
    target: goal.target != null ? String(goal.target) : '',
    period: goal.period ?? PERIODS.CUSTOM,
    startDate: goal.startDate ?? '',
    endDate: goal.endDate ?? '',
    recurring: Boolean(goal.recurring),
  };
}
