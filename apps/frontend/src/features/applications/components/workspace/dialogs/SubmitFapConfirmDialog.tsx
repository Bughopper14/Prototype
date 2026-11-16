/** Confirm submitting the FAP stage. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {Modal} from '@/shared/ui/Modal';
import {ArrowRight, Loader2} from 'lucide-react';

export function SubmitFapConfirmDialog() {
  const {a, submitFapConfirm, setSubmitFapConfirm, draft, busy, error, submitFapStage} =
    useWorkspace();
  return (
    <>
      {submitFapConfirm && (
        <Modal title="Submit FAP Stage" onClose={() => setSubmitFapConfirm(false)}>
          <div className="modal-body">
            <p className="muted">
              {a.customer?.companyName || draft.customer?.companyName} · {a.fapNumber}
            </p>
            <p>
              Submit FAP Stage data and proceed to <strong>Pre-analysis</strong>?
            </p>
            <p className="muted">
              Once submitted, the Pre-analysis stage (Business & banks, Financial statements, Documents) will
              be unlocked for data entry.
            </p>
            {error && <div className="error">{error}</div>}
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setSubmitFapConfirm(false)}>
              Cancel
            </button>
            <button className="button primary" disabled={busy} onClick={submitFapStage}>
              {busy ? <Loader2 size={15} className="spin" /> : <ArrowRight size={15} />}Submit to Pre-analysis
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
