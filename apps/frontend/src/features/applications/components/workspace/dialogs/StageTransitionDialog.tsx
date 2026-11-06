/** Confirm a stage transition (approve, return, reject…) with a note. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {api} from '@/shared/lib/api';
import {Modal} from '@/shared/ui/Modal';
import {label} from '@liugong/shared';

export function StageTransitionDialog() {
  const {
    a,
    onChange,
    notify,
    busy,
    setBusy,
    error,
    setError,
    transition,
    setTransition,
    comments,
    setComments,
  } = useWorkspace();
  return (
    <>
      {transition && (
        <Modal title={label(transition)} onClose={() => setTransition('')}>
          <div className="modal-body">
            <p className="muted">
              {a.customer.companyName} · {a.fapNumber}
            </p>
            <p>Required information and documents will be checked before this action is recorded.</p>
            <label>
              Decision notes
              <textarea
                rows={4}
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Add context for the next reviewer…"
              />
            </label>
            {error && <div className="error">{error}</div>}
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setTransition('')}>
              Cancel
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  onChange(
                    await api(`/applications/${a.id}/transition`, 'POST', {action: transition, comments}),
                  );
                  setTransition('');
                  notify('Workflow action recorded');
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm {label(transition).toLowerCase()}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
