/** Simple "Yes or No" confirmation bubble modal before submitting a document for approval. */
import {Send, X, Loader2, ShieldCheck, FileCheck} from 'lucide-react';
import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export function SubmitApprovalConfirmModal({
  row,
  isOpen,
  onClose,
  onConfirm,
  busy = false,
}: {
  row: ChecklistRow | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (row: ChecklistRow) => void;
  busy?: boolean;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !busy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, busy, onClose]);

  if (!isOpen || !row) return null;

  return createPortal(
    <div className="doc-confirm-backdrop" onClick={!busy ? onClose : undefined}>
      <div className="doc-confirm-dialog" onClick={e => e.stopPropagation()}>
        {/* Close Icon */}
        <button
          type="button"
          className="doc-confirm-close"
          onClick={!busy ? onClose : undefined}
          disabled={busy}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="doc-confirm-body">
          {/* Header Icon Bubble */}
          <div className="doc-confirm-icon-bubble">
            <Send size={22} className="text-primary" />
          </div>

          <h3 className="doc-confirm-title">Submit for Approval?</h3>

          <p className="doc-confirm-desc">
            Are you sure you want to submit this document for approval?
          </p>

          {/* Document Summary Card */}
          <div className="doc-confirm-item-card">
            <div className="doc-confirm-item-top">
              <span className="doc-confirm-code">{row.code}</span>
              <strong className="doc-confirm-name">{row.name}</strong>
            </div>
            <div className="doc-confirm-item-sub">
              <span>Stage: <strong>{row.stageName || row.stage}</strong></span>
              <span>·</span>
              <span className="text-success" style={{display: 'inline-flex', alignItems: 'center', gap: '3px'}}>
                <FileCheck size={12} /> {row.files?.length || 1} file(s) attached
              </span>
            </div>
          </div>

          <p className="doc-confirm-note">
            <ShieldCheck size={13} style={{flexShrink: 0, marginTop: '2px'}} />
            <span>
              Once submitted, the multi-level approval workflow will begin and the document will be reviewed by designated authorities.
            </span>
          </p>

          {/* Simple Yes or No Buttons */}
          <div className="doc-confirm-actions">
            <button
              type="button"
              className="button doc-confirm-btn-cancel"
              disabled={busy}
              onClick={onClose}
            >
              Cancel (No)
            </button>
            <button
              type="button"
              className="button primary doc-confirm-btn-submit"
              disabled={busy}
              onClick={() => onConfirm(row)}
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Yes, Submit</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
