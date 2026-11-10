/** Generic modal dialog shell. */
import {X} from 'lucide-react';
import {type ReactNode} from 'react';

export function Modal({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div
      className="modal-scrim"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
