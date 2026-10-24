import { useSyncExternalStore } from 'react';

function subscribe(onChange) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

// True while the browser reports a network connection.
export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, () => navigator.onLine);
}
