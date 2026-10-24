import { useRegisterSW } from 'virtual:pwa-register/react';

// Shown when a new version of the app has been downloaded. It activates only on "refresh",
// so a form being filled in is never reloaded away.
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="update-prompt" role="alert">
      <span>יש גרסה חדשה של האפליקציה.</span>
      <div className="update-prompt-actions">
        <button type="button" className="btn btn-primary" onClick={() => updateServiceWorker(true)}>
          רענון
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setNeedRefresh(false)}>
          אחר כך
        </button>
      </div>
    </div>
  );
}
