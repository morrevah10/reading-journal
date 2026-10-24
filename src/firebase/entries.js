import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './config';
import { localWrite } from './localWrite';

// Notes and quotes share the same shape and access pattern: users/{uid}/books/{bookId}/{kind}.
export const ENTRY_KINDS = {
  NOTES: 'notes',
  QUOTES: 'quotes',
};

function entriesCollection(uid, bookId, kind) {
  return collection(db, 'users', uid, 'books', bookId, kind);
}

// Newest first. Unlimited: the whole list is loaded, which is fine for a single user.
export function subscribeEntries(uid, bookId, kind, onData, onError) {
  return onSnapshot(
    query(entriesCollection(uid, bookId, kind), orderBy('createdAt', 'desc')),
    (snapshot) =>
      onData(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })),
      ),
    onError,
  );
}

// Writes resolve once they are in the local cache (see localWrite), so they also work offline.
export async function addEntry(uid, bookId, kind, data) {
  const ref = doc(entriesCollection(uid, bookId, kind));
  localWrite(setDoc(ref, { ...data, createdAt: serverTimestamp() }));
  return ref.id;
}

export async function updateEntry(uid, bookId, kind, entryId, patch) {
  localWrite(updateDoc(doc(entriesCollection(uid, bookId, kind), entryId), patch));
}

export async function deleteEntry(uid, bookId, kind, entryId) {
  localWrite(deleteDoc(doc(entriesCollection(uid, bookId, kind), entryId)));
}
