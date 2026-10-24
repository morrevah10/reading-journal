import { NavLink } from 'react-router-dom';

export const NAV_ITEMS = [
  { to: '/', label: 'מדף', icon: '📚', end: true },
  { to: '/want', label: 'רוצה לקרוא', icon: '🔖' },
  { to: '/goals', label: 'יעדים', icon: '🎯' },
  { to: '/stats', label: 'סטטיסטיקות', icon: '📊' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="ניווט ראשי">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
