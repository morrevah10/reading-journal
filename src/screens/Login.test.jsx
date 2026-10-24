import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signInWithGoogle } from '../firebase/auth';
import Login from './Login';

describe('Login', () => {
  it('calls signInWithGoogle when the button is clicked', async () => {
    signInWithGoogle.mockResolvedValue({});
    render(<Login />);
    await userEvent.click(screen.getByRole('button', { name: 'כניסה עם Google' }));
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('shows an error message when sign-in fails', async () => {
    signInWithGoogle.mockRejectedValue(new Error('popup closed'));
    render(<Login />);
    await userEvent.click(screen.getByRole('button', { name: 'כניסה עם Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('הכניסה נכשלה');
  });
});
