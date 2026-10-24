import { Link, Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">יומן קריאה</h1>
        <Link to="/settings" className="icon-button" aria-label="הגדרות">
          ⚙️
        </Link>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
