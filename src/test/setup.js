import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Global Firebase mocks so no test ever initializes the real app (CI has no .env.local).
// Paths are relative to this file. A test file may still vi.mock these with its own factory.
vi.mock('../firebase/config', () => ({ app: {}, auth: {}, db: {} }));

vi.mock('../firebase/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOutUser: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
}));

// The genre list was never saved, so the default list is used. Settings tests mock their own.
vi.mock('../firebase/settings', () => ({
  subscribeGenres: vi.fn((uid, onData) => {
    onData(null);
    return () => {};
  }),
  saveGenres: vi.fn(async () => {}),
  genresDoc: vi.fn((uid) => ({ path: `users/${uid}/settings/genres` })),
}));

// Recharts' ResponsiveContainer needs ResizeObserver, which jsdom doesn't provide.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
