/** In-page confirmation modal for User Management (replaces native browser confirm). */
import {useCallback, useRef, useState, type ReactNode} from 'react';

type PortalConfirmAsk = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
};

export function usePortalConfirm(): [(ask: PortalConfirmAsk) => Promise<boolean>, ReactNode] {
  const [ask, setAsk] = useState<PortalConfirmAsk | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const open = useCallback(
    (next: PortalConfirmAsk) =>
      new Promise<boolean>(resolve => {
        resolver.current = resolve;
        setAsk(next);
      }),
    [],
  );

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setAsk(null);
  };

  const modal = ask ? (
    <div className="pt-modal-backdrop" onClick={() => close(false)}>
      <div
        className="pt-modal"
        style={{maxWidth: 440}}
        role="dialog"
        aria-modal="true"
        aria-label={ask.title}
        onClick={e => e.stopPropagation()}
      >
        <div className="pt-modal-bar" />
        <div className="pt-modal-head">
          <div className="pt-modal-title">
            <h5>{ask.title}</h5>
          </div>
          <button type="button" className="pt-modal-close" aria-label="Close" onClick={() => close(false)}>
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="pt-modal-body">
          <p style={{margin: 0, fontSize: '0.92rem', lineHeight: 1.55, color: '#334155'}}>{ask.message}</p>
        </div>
        <div className="pt-modal-foot">
          <button type="button" className="pt-btn-light" onClick={() => close(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="pt-btn-primary"
            style={ask.danger ? {background: '#dc2626', borderColor: '#dc2626'} : undefined}
            autoFocus
            onClick={() => close(true)}
          >
            {ask.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return [open, modal];
}
