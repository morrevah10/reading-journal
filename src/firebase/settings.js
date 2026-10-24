import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './config';
import { localWrite } from './localWrite';

// App settings live in users/{uid}/settings/{name}; for now only the genre list.
export function settingsDoc(uid, name) {
  return doc(db, 'users', uid, 'settings', name);
}

export function genresDoc(uid) {
  return settingsDoc(uid, 'genres');
}

// Calls onData with the saved list, or null when it was never saved.
export function subscribeGenres(uid, onData, onError) {
  return onSnapshot(
    genresDoc(uid),
    (snapshot) => onData(snapshot.exists() ? (snapshot.data().list ?? null) : null),
    onError,
  );
}

// Resolves once the write is in the local cache (see localWrite), so it also works offline.
export async function saveGenres(uid, list) {
  localWrite(setDoc(genresDoc(uid), { list, updatedAt: serverTimestamp() }));
}
