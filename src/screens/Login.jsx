import { useState } from 'react';
import { signInWithGoogle } from '../firebase/auth';
import { authErrorCode } from '../lib/authErrors';

export default function Login() {
  // The Firebase error code of the last failed sign-in, or null.
  const [errorCode, setErrorCode] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setErrorCode(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign-in failed', error);
      setErrorCode(authErrorCode(error));
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
      {errorCode && (
        <p className="error-text" role="alert">
          הכניסה נכשלה. נסה שוב.{' '}
          <bdi className="error-code" dir="ltr">
            ({errorCode})
          </bdi>
        </p>
      )}
    </div>
  );
}
