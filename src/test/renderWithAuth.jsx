import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../hooks/useAuth';

export const testUser = {
  uid: 'test-uid-123',
  displayName: 'מור',
  email: 'mor@example.com',
};

// Renders a component inside a router with a fixed auth state, bypassing Firebase.
export function renderWithAuth(
  ui,
  { user = testUser, loading = false, route = '/' } = {},
) {
  return render(
    <AuthContext.Provider value={{ user, loading }}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  );
}
