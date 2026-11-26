import React, {useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import {AlertTriangle, X} from 'lucide-react';

export interface ConfirmUploadBubbleProps {
  open: boolean;
  title?: string;
  message?: string;
  onCancel: () => void;
  onConfirm: () => void;
  placement?: 'top' | 'bottom' | 'center';
}

/**
 * A centered modal dialog for confirming re-upload of an already approved document.
 * Informs the user that proceeding will restart the approval process specifically for this document.
 * Uses createPortal into document.body to prevent any CSS overflow/clipping from parent table cells.
 * All UI text in English.
 */
export function ConfirmUploadBubble({
  open,
  title = 'Are you sure?',
  message = 'This document has already been approved. Uploading a new file will restart the approval process specifically for this document.',
  onCancel,
  onConfirm,
}: ConfirmUploadBubbleProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onCancel}
    >
      <div
        ref={modalRef}
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e2e8f0',
          padding: '24px',
          textAlign: 'left',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close"
        >
          <X size={18} />
        </button>

        <div style={{display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px'}}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div style={{paddingRight: '20px'}}>
            <h3 style={{margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3}}>
              {title}
            </h3>
            <p style={{margin: '6px 0 0 0', fontSize: '13px', lineHeight: 1.5, color: '#475569'}}>
              {message}
            </p>
          </div>
        </div>

        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px'}}>
          <button
            type="button"
            className="button"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button primary"
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
            onClick={onConfirm}
          >
            Yes, proceed
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
