/** Close, edit, submit, check, approve and reject buttons. */
import {AlertCircle, Check, FileText, Pencil, Send} from 'lucide-react';

export function ReviewActions({
  status,
  canSubmit,
  canApprove,
  legacyReview = true,
  busy,
  comments,
  documentId,
  url,
  onClose,
  onEdit,
  action,
}: {
  status: string;
  canSubmit: boolean;
  canApprove: boolean;
  /** False when the approval of the deed section in the workflow decides: the old submit / approve / reject / remarks are not drawn. */
  legacyReview?: boolean;
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
        {legacyReview && canApprove && (
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
        {legacyReview && canApprove && (
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
        {legacyReview && canSubmit && (
          <button className="button primary" disabled={busy} onClick={() => action('SUBMIT')}>
            <Send size={14} />
            {status === 'REJECTED' ? 'Resubmit for Legal Approval' : 'Submit for Legal Approval'}
          </button>
        )}
        {legacyReview && canApprove && (
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
