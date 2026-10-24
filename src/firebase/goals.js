import {
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
import { localWrite } from './localWrite';

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

// Writes resolve once they are in the local cache (see localWrite), so they also work offline.

// Recurring goals get a deterministic id ({seriesId}__{period}); others an automatic local one.
export async function saveNewGoal(uid, goal) {
  const data = { ...goal, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const ref =
    goal.seriesId && goal.recurring
      ? doc(goalsCollection(uid), goalDocId(goal.seriesId, goal.period, goal.startDate))
      : doc(goalsCollection(uid));
  localWrite(setDoc(ref, data));
  return ref.id;
}

// Writes renewal documents from planRenewals(). Setting the same id twice is harmless.
export async function createRenewals(uid, renewals) {
  const batch = writeBatch(db);
  for (const { id, data } of renewals) {
    batch.set(doc(goalsCollection(uid), id), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  localWrite(batch.commit());
}

export async function updateGoal(uid, goalId, patch) {
  localWrite(updateDoc(doc(goalsCollection(uid), goalId), { ...patch, updatedAt: serverTimestamp() }));
}

// Deletes one goal; `stopIds` are other periods of its series whose renewal is turned off.
export async function deleteGoal(uid, goalId, stopIds = []) {
  const batch = writeBatch(db);
  batch.delete(doc(goalsCollection(uid), goalId));
  for (const id of stopIds) {
    batch.update(doc(goalsCollection(uid), id), { recurring: false, updatedAt: serverTimestamp() });
  }
  localWrite(batch.commit());
}
