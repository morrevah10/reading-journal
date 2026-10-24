import { useEffect, useRef } from 'react';
import { createRenewals, subscribeGoals } from '../firebase/goals';
import { todayISO } from '../lib/dates';
import { planRenewals } from '../lib/goals';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';

const EMPTY = [];

export function useGoals() {
  const uid = useAuth().user?.uid ?? null;
  return useSubscription(uid, (onData, onError) => subscribeGoals(uid, onData, onError), EMPTY);
}

// Creates missing periods of recurring goals once the goals have loaded.
// Each id is attempted once per session; the snapshot then includes the new documents.
export function useGoalRenewals(goals, loading) {
  const uid = useAuth().user?.uid ?? null;
  const attempted = useRef(new Set());

  useEffect(() => {
    if (!uid || loading) return;
    const renewals = planRenewals(goals, todayISO()).filter(
      ({ id }) => !attempted.current.has(id),
    );
    if (renewals.length === 0) return;
    renewals.forEach(({ id }) => attempted.current.add(id));
    createRenewals(uid, renewals).catch(() => {
      // Allow a retry on the next snapshot.
      renewals.forEach(({ id }) => attempted.current.delete(id));
    });
  }, [uid, goals, loading]);
}
