import { useEffect, useId } from 'react';

// Minimal modal: overlay + panel, closes on Escape or overlay tap.
export default function Dialog({ open, title, onClose, children }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'אישור',
  danger = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      {message && <p>{message}</p>}
      <div className="dialog-actions">
        <button
          type="button"
          className={danger ? 'btn btn-danger' : 'btn btn-primary'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          ביטול
        </button>
      </div>
    </Dialog>
  );
}
