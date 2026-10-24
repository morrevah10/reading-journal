import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// The project's database is named "default", not the implicit "(default)".
// Must match "database" in firebase.json.
export const FIRESTORE_DATABASE_ID = 'default';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Data is kept in IndexedDB so the app works offline; writes made offline sync when back online.
// The multiple-tab manager lets the app stay open in several tabs at once.
export const db = initializeFirestore(
  app,
  { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
  FIRESTORE_DATABASE_ID,
);
