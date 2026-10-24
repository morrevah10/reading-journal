import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { goalDocId } from '../lib/goals';
import { db } from './config';

export function goalsCollection(uid) {
  return collection(db, 'users', uid, 'goals');
}

export function subscribeGoals(uid, onData, onError) {
  return onSnapshot(
    goalsCollection(uid),
    (snapshot) =>
      onData(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })),
      ),
    onError,
  );
}

// Recurring goals get a deterministic id ({seriesId}__{period}); others an automatic one.
export async function saveNewGoal(uid, goal) {
  const data = { ...goal, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  if (goal.seriesId && goal.recurring) {
    const id = goalDocId(goal.seriesId, goal.period, goal.startDate);
    await setDoc(doc(goalsCollection(uid), id), data);
    return id;
  }
  const ref = await addDoc(goalsCollection(uid), data);
  return ref.id;
}

// Writes renewal documents from planRenewals(). Setting the same id twice is harmless.
export function createRenewals(uid, renewals) {
  const batch = writeBatch(db);
  for (const { id, data } of renewals) {
    batch.set(doc(goalsCollection(uid), id), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return batch.commit();
}

export function updateGoal(uid, goalId, patch) {
  return updateDoc(doc(goalsCollection(uid), goalId), { ...patch, updatedAt: serverTimestamp() });
}

// Deletes one goal; `stopIds` are other periods of its series whose renewal is turned off.
export function deleteGoal(uid, goalId, stopIds = []) {
  const batch = writeBatch(db);
  batch.delete(doc(goalsCollection(uid), goalId));
  for (const id of stopIds) {
    batch.update(doc(goalsCollection(uid), id), { recurring: false, updatedAt: serverTimestamp() });
  }
  return batch.commit();
}
