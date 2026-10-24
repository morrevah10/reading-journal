import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';

function LocationDisplay() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

function renderNav(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <BottomNav />
      <Routes>
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BottomNav', () => {
  it('shows the four tabs in Hebrew', () => {
    renderNav();
    for (const label of ['מדף', 'רוצה לקרוא', 'יעדים', 'סטטיסטיקות']) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it.each([
    ['רוצה לקרוא', '/want'],
    ['יעדים', '/goals'],
    ['סטטיסטיקות', '/stats'],
  ])('navigates to %s', async (label, path) => {
    renderNav();
    await userEvent.click(screen.getByRole('link', { name: new RegExp(label) }));
    expect(screen.getByTestId('location')).toHaveTextContent(path);
  });

  it('marks only the current tab as active', () => {
    renderNav('/goals');
    expect(screen.getByRole('link', { name: /יעדים/ })).toHaveClass('active');
    expect(screen.getByRole('link', { name: /מדף/ })).not.toHaveClass('active');
  });
});
