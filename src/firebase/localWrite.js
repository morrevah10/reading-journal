// Firestore applies a write to its local cache immediately, but the returned promise resolves only
// when the server confirms it, which never happens while offline. The app treats a write as done
// once it is in the local cache, so screens don't hang offline; Firestore syncs it when the
// connection returns. A later rejection from the server (e.g. security rules) can only be logged.
export function localWrite(pending) {
  pending.catch((error) => console.error('Firestore write was rejected by the server', error));
}
