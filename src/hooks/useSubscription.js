import { useEffect, useState } from 'react';

// Runs `subscribe(onData, onError)` while `key` is non-null and returns { data, loading, error }.
// `subscribe` must return an unsubscribe function. The subscription restarts when `key` changes.
export function useSubscription(key, subscribe, initialData) {
  const [state, setState] = useState({ key: null, data: initialData, loading: true, error: null });

  useEffect(() => {
    if (key === null) return undefined;
    return subscribe(
      (data) => setState({ key, data, loading: false, error: null }),
      (error) => setState({ key, data: initialData, loading: false, error }),
    );
    // `subscribe` and `initialData` are recreated each render; `key` captures their inputs.
  }, [key]);

  // Data from a previous key is never shown while the new subscription loads.
  if (state.key !== key) return { data: initialData, loading: key !== null, error: null };
  return { data: state.data, loading: state.loading, error: state.error };
}
