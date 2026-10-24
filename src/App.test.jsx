import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithAuth } from './test/renderWithAuth';
import App from './App';

vi.mock('./firebase/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOutUser: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
}));

vi.mock('./firebase/books', () => ({
  subscribeBooks: vi.fn((uid, onData) => {
    onData([]);
    return () => {};
  }),
}));

vi.mock('./firebase/entries', () => ({
  ENTRY_KINDS: { NOTES: 'notes', QUOTES: 'quotes' },
}));

describe('App auth gate', () => {
  it('shows a loading state while auth is resolving', () => {
    renderWithAuth(<App />, { user: null, loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('טוען');
  });

  it('shows the login screen when signed out', () => {
    renderWithAuth(<App />, { user: null });
    expect(screen.getByRole('button', { name: 'כניסה עם Google' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('shows the shelf and navigation when signed in', () => {
    renderWithAuth(<App />);
    expect(screen.getByRole('heading', { name: 'המדף שלי' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'ניווט ראשי' })).toBeInTheDocument();
  });

  it('redirects unknown routes to the shelf', () => {
    renderWithAuth(<App />, { route: '/no-such-page' });
    expect(screen.getByRole('heading', { name: 'המדף שלי' })).toBeInTheDocument();
  });

  it('opens settings from the header icon route', () => {
    renderWithAuth(<App />, { route: '/settings' });
    expect(screen.getByRole('heading', { name: 'הגדרות' })).toBeInTheDocument();
  });
});
