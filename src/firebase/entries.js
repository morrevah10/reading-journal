import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './config';

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

export async function addEntry(uid, bookId, kind, data) {
  const ref = await addDoc(entriesCollection(uid, bookId, kind), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function updateEntry(uid, bookId, kind, entryId, patch) {
  return updateDoc(doc(entriesCollection(uid, bookId, kind), entryId), patch);
}

export function deleteEntry(uid, bookId, kind, entryId) {
  return deleteDoc(doc(entriesCollection(uid, bookId, kind), entryId));
}
