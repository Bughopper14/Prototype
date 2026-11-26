/** Close, edit, submit, check, approve and reject buttons. */
import {AlertCircle, Check, FileText, Pencil, Send} from 'lucide-react';

export function DeedApprovalActions({
  status,
  canSubmit,
  canApprove,
  canDecide = false,
  onDecide,
  legacyApproval = true,
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
  /** The workflow's approval of this deed waits for this person: Approve / Reject are drawn here. */
  canDecide?: boolean;
  onDecide?: (decision: 'APPROVED' | 'REJECTED') => void;
  /** False when the approval of the deed section in the workflow decides: the old submit / approve / reject / remarks are not drawn. */
  legacyApproval?: boolean;
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
        {legacyApproval && canApprove && (
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
        {legacyApproval && canApprove && (
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
        {canDecide && onDecide && (
          <>
            <button
              className="button danger"
              disabled={busy || !comments.trim()}
              title={comments.trim() ? 'Reject the deed' : 'Write the reason first'}
              onClick={() => onDecide('REJECTED')}
            >
              <AlertCircle size={14} />
              Reject
            </button>
            <button className="button primary" disabled={busy} onClick={() => onDecide('APPROVED')}>
              <Check size={14} />
              Approve
            </button>
          </>
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
        {legacyApproval && canSubmit && (
          <button className="button primary" disabled={busy} onClick={() => action('SUBMIT')}>
            <Send size={14} />
            {status === 'REJECTED' ? 'Resubmit for Legal Approval' : 'Submit for Legal Approval'}
          </button>
        )}
        {legacyApproval && canApprove && (
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
