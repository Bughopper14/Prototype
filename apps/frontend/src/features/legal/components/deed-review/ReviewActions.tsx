/** Close, edit, submit, check, approve and reject buttons. */
import {AlertCircle, Check, FileText, Pencil, Send} from 'lucide-react';

export function ReviewActions({
  deed,
  canSubmit,
  canCheck,
  canApprove,
  busy,
  comments,
  documentId,
  url,
  onClose,
  onEdit,
  action,
}: {
  deed: any;
  canSubmit: boolean;
  canCheck: boolean;
  canApprove: boolean;
  busy: boolean;
  comments: string;
  documentId: string;
  url: string;
  onClose: () => void;
  onEdit: ((what: 'deed' | 'stakeholders') => void) | undefined;
  action: (action: string) => void;
}) {
  return (
    <>
      <div className="modal-actions">
        <button className="button" disabled={busy} onClick={onClose}>
          Close
        </button>
        {(canCheck || canApprove) && (
          <button
            className="button"
            disabled={busy || !comments.trim()}
            title={comments.trim() ? 'Send the remarks back to MKT to change' : 'Write the remarks first'}
            onClick={() => action('REMARKS')}
          >
            <FileText size={14} />
            Remarks
          </button>
        )}
        {(canCheck || canApprove) && (
          <button
            className="button danger"
            disabled={busy || !comments.trim()}
            title={comments.trim() ? 'Reject the deed' : 'Write the reason first'}
            onClick={() => action('REJECT')}
          >
            <AlertCircle size={14} />
            Reject
          </button>
        )}
        {canSubmit && onEdit && (
          <>
            <button className="button" disabled={busy} onClick={() => onEdit('stakeholders')}>
              <Pencil size={14} />
              Edit stakeholders
            </button>
            <button className="button" disabled={busy} onClick={() => onEdit('deed')}>
              <Pencil size={14} />
              Edit deed
            </button>
          </>
        )}
        {canSubmit && (
          <button className="button primary" disabled={busy} onClick={() => action('SUBMIT')}>
            <Send size={14} />
            {(deed.reviewHistory || []).length ? 'Resubmit for Legal Approval' : 'Submit for Legal Approval'}
          </button>
        )}
        {canCheck && (
          <button
            className="button primary"
            disabled={busy || Boolean(documentId && !url)}
            onClick={() => action('CHECK')}
          >
            <Check size={14} />
            Verification passed
          </button>
        )}
        {canApprove && (
          <button
            className="button primary"
            disabled={busy || Boolean(documentId && !url)}
            onClick={() => action('APPROVE')}
          >
            <Check size={14} />
            Approve deed
          </button>
        )}
      </div>
    </>
  );
}
