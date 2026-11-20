import { useAuth } from '../hooks/useAuth';
import { signOutUser } from '../firebase/auth';
import CoverBackfill from '../components/CoverBackfill';
import ExportData from '../components/ExportData';
import GenreManager from '../components/GenreManager';

export default function Settings() {
  const { user } = useAuth();

  return (
    <section className="screen">
      <h2 className="screen-title">הגדרות</h2>
      <div className="card">
        <h3 className="card-title">חשבון</h3>
        <p>{user?.displayName}</p>
        <p className="muted">{user?.email}</p>
        <details className="tech-details">
          <summary className="muted">פרטים טכניים</summary>
          <p className="muted">
            מזהה משתמש: <code className="uid">{user?.uid}</code>
          </p>
        </details>
        <button type="button" className="btn btn-secondary" onClick={() => signOutUser()}>
          התנתקות
        </button>
      </div>
      <GenreManager />
      <CoverBackfill />
      <ExportData />
    </section>
  );
}
