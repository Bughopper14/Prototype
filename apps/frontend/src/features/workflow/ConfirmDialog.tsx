/** A confirmation dialog in the page (instead of the browser's own box). `ask` resolves true on confirm, false on cancel. */
import {Modal} from '@/shared/ui/Modal';
import {AlertTriangle, Power, PowerOff} from 'lucide-react';
import {useCallback, useRef, useState, type ReactNode} from 'react';

type Ask = {title: string; message: string; confirmLabel?: string; tone?: 'default' | 'danger'; icon?: 'power' | 'off' | 'warn'};

export function useConfirm(): [(a: Ask) => Promise<boolean>, ReactNode] {
  const [ask, setAsk] = useState<Ask | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const open = useCallback(
    (a: Ask) =>
      new Promise<boolean>(resolve => {
        resolver.current = resolve;
        setAsk(a);
      }),
    [],
  );
  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setAsk(null);
  };
  const Icon = ask?.icon === 'power' ? Power : ask?.icon === 'off' ? PowerOff : AlertTriangle;
  const element = ask ? (
    <Modal title={ask.title} onClose={() => close(false)} className="wf-confirm-modal">
      <div className="wf-confirm">
        <span className={`wf-confirm-icon ${ask.tone === 'danger' ? 'danger' : ''}`}>
          <Icon size={22} />
        </span>
        <p>{ask.message}</p>
      </div>
      <div className="wf-confirm-actions">
        <button className="wf-btn" onClick={() => close(false)}>
          Cancel
        </button>
        <button className={`wf-btn ${ask.tone === 'danger' ? 'danger' : 'primary'}`} autoFocus onClick={() => close(true)}>
          {ask.confirmLabel || 'Confirm'}
        </button>
      </div>
    </Modal>
  ) : null;
  return [open, element];
}
