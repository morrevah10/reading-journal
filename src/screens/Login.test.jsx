import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signInWithGoogle } from '../firebase/auth';
import Login from './Login';

function firebaseError(code) {
  return Object.assign(new Error(`Firebase: Error (${code}).`), { name: 'FirebaseError', code });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Login', () => {
  it('calls signInWithGoogle when the button is clicked', async () => {
    signInWithGoogle.mockResolvedValue({});
    render(<Login />);
    await userEvent.click(screen.getByRole('button', { name: 'כניסה עם Google' }));
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the error message with the Firebase error code', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    signInWithGoogle.mockRejectedValue(firebaseError('auth/popup-closed-by-user'));
    render(<Login />);
    await userEvent.click(screen.getByRole('button', { name: 'כניסה עם Google' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('הכניסה נכשלה. נסה שוב.');
    expect(alert).toHaveTextContent('(auth/popup-closed-by-user)');
  });

  it('shows "unknown" when the error has no code, and logs the error', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('something');
    signInWithGoogle.mockRejectedValue(error);
    render(<Login />);
    await userEvent.click(screen.getByRole('button', { name: 'כניסה עם Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('(unknown)');
    expect(log).toHaveBeenCalledWith('Sign-in failed', error);
  });

  it('clears the error and shows the new code on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    signInWithGoogle
      .mockRejectedValueOnce(firebaseError('auth/popup-blocked'))
      .mockRejectedValueOnce(firebaseError('auth/network-request-failed'));
    render(<Login />);
    const button = screen.getByRole('button', { name: 'כניסה עם Google' });

    await userEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('auth/popup-blocked');

    await userEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('auth/network-request-failed');
    expect(screen.getByRole('alert')).not.toHaveTextContent('auth/popup-blocked');
  });
});
