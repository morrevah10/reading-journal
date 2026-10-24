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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
