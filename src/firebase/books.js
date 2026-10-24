import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';

// Firestore allows up to 500 writes per batch.
const BATCH_LIMIT = 500;
const SUBCOLLECTIONS = ['notes', 'quotes'];

export function booksCollection(uid) {
  return collection(db, 'users', uid, 'books');
}

export function bookDoc(uid, bookId) {
  return doc(db, 'users', uid, 'books', bookId);
}

export function subscribeBooks(uid, onData, onError) {
  return onSnapshot(
    booksCollection(uid),
    (snapshot) => onData(snapshot.docs.map(toBook)),
    onError,
  );
}

export function subscribeBook(uid, bookId, onData, onError) {
  return onSnapshot(
    bookDoc(uid, bookId),
    (snapshot) => onData(snapshot.exists() ? toBook(snapshot) : null),
    onError,
  );
}

export async function addBook(uid, book) {
  const ref = await addDoc(booksCollection(uid), {
    ...book,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function updateBook(uid, bookId, patch) {
  return updateDoc(bookDoc(uid, bookId), { ...patch, updatedAt: serverTimestamp() });
}

// Deletes the book together with all of its notes and quotes.
export async function deleteBook(uid, bookId) {
  const book = bookDoc(uid, bookId);
  const snapshots = await Promise.all(
    SUBCOLLECTIONS.map((name) => getDocs(collection(book, name))),
  );
  // The book itself goes last, so a partial failure never leaves orphaned entries without a book.
  const refs = [...snapshots.flatMap((snapshot) => snapshot.docs.map((d) => d.ref)), book];

  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

function toBook(snapshot) {
  return { id: snapshot.id, ...snapshot.data({ serverTimestamps: 'estimate' }) };
}
