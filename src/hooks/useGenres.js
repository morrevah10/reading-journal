import { useMemo } from 'react';
import { subscribeGenres } from '../firebase/settings';
import { genreListOrDefault } from '../lib/genres';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';

// The genre list, sorted; the default list until one was saved.
export function useGenres() {
  const uid = useAuth().user?.uid ?? null;
  const state = useSubscription(uid, (onData, onError) => subscribeGenres(uid, onData, onError), null);
  const list = useMemo(() => genreListOrDefault(state.data), [state.data]);
  return { list, loading: state.loading, error: state.error };
}
