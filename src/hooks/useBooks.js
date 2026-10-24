import { subscribeBook, subscribeBooks } from '../firebase/books';
import { subscribeEntries } from '../firebase/entries';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';

const EMPTY = [];

export function useBooks() {
  const uid = useAuth().user?.uid ?? null;
  return useSubscription(uid, (onData, onError) => subscribeBooks(uid, onData, onError), EMPTY);
}

export function useBook(bookId) {
  const uid = useAuth().user?.uid ?? null;
  const key = uid && bookId ? `${uid}/${bookId}` : null;
  return useSubscription(
    key,
    (onData, onError) => subscribeBook(uid, bookId, onData, onError),
    null,
  );
}

export function useEntries(bookId, kind) {
  const uid = useAuth().user?.uid ?? null;
  const key = uid && bookId ? `${uid}/${bookId}/${kind}` : null;
  return useSubscription(
    key,
    (onData, onError) => subscribeEntries(uid, bookId, kind, onData, onError),
    EMPTY,
  );
}
