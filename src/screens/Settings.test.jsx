import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signOutUser } from '../firebase/auth';
import { renderWithAuth, testUser } from '../test/renderWithAuth';
import Settings from './Settings';

vi.mock('../firebase/auth', () => ({
  signOutUser: vi.fn(),
}));

describe('Settings', () => {
  it('shows the signed-in account details including the uid', () => {
    renderWithAuth(<Settings />);
    expect(screen.getByText(testUser.displayName)).toBeInTheDocument();
    expect(screen.getByText(testUser.email)).toBeInTheDocument();
    expect(screen.getByText(testUser.uid)).toBeInTheDocument();
  });

  it('calls signOutUser when sign-out is clicked', async () => {
    renderWithAuth(<Settings />);
    await userEvent.click(screen.getByRole('button', { name: 'התנתקות' }));
    expect(signOutUser).toHaveBeenCalledTimes(1);
  });
});
