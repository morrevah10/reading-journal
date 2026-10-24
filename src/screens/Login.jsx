import { useState } from 'react';
import { signInWithGoogle } from '../firebase/auth';

export default function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      setError('הכניסה נכשלה. נסה שוב.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <h1 className="login-title">יומן קריאה</h1>
      <p className="login-subtitle">כל הספרים, הנקודות והציטוטים במקום אחד</p>
      <button type="button" className="btn btn-primary" onClick={handleSignIn} disabled={busy}>
        כניסה עם Google
      </button>
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}
