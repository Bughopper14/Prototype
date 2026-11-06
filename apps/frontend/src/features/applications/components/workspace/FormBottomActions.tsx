/** Back / save / submit buttons under the form tabs. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {ArrowLeft, ArrowRight, Loader2, Lock, Save} from 'lucide-react';

export function FormBottomActions() {
  const {
    onBack,
    saveNewApplication,
    setSubmitFapConfirm,
    tab,
    draft,
    busy,
    setError,
    setTransition,
    setComments,
    setSaveConfirm,
    isFapStage,
    isSubmitLocked,
    actions,
    save,
  } = useWorkspace();
  return (
    <div className="form-bottom-actions">
      <div className="form-bottom-left">
        {draft.isNew ? (
          <button type="button" className="button" onClick={onBack}>
            <ArrowLeft size={15} />
            Cancel / Return to Workspace
          </button>
        ) : null}
      </div>
      <div className="form-bottom-right">
        {draft.isNew ? (
          <button type="button" className="button primary" disabled={busy} onClick={saveNewApplication}>
            {busy ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Save & Create Application
          </button>
        ) : (
          (tab === 0 || tab === 2 || tab === 3 || tab === 4 || tab === 5) && (
            <button
              className="button primary"
              disabled={busy}
              onClick={tab === 5 ? () => setSaveConfirm(true) : save}
            >
              {busy ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Save changes
            </button>
          )
        )}
        {actions.length > 0 && (
          <div className="workflow-buttons">
            {actions.map(action => {
              const isSubmitFap = isFapStage && action === 'SUBMIT_TO_BS';
              const isActionLocked = (isSubmitFap || action === 'SUBMIT_TO_BS') && isSubmitLocked;
              return (
                <button
                  key={action}
                  className={
                    'button ' + (action === 'RETURN' || action === 'REJECT_COMMITTEE' ? '' : 'primary')
                  }
                  disabled={isActionLocked}
                  title={
                    isActionLocked
                      ? 'Please upload the signed FAP Stage document in the Documents tab first to proceed.'
                      : undefined
                  }
                  onClick={() => {
                    if (isSubmitFap) {
                      setSubmitFapConfirm(true);
                    } else {
                      setComments('');
                      setTransition(action);
                      setError('');
                    }
                  }}
                >
                  {isActionLocked && <Lock size={13} style={{marginRight: 4}} />}
                  {isSubmitFap
                    ? 'Submit'
                    : (
                        {
                          SUBMIT_TO_BS: 'Submit to BS',
                          VERIFY_BS: 'Complete BS verification',
                          START_REVIEW: 'Start CA & Legal review',
                          RECOMMEND_CA: 'Sign off · CA',
                          RECOMMEND_LEGAL: 'Sign off · Legal',
                          APPROVE_COMMITTEE: 'Approve',
                          REJECT_COMMITTEE: 'Reject',
                          RETURN: 'Return',
                        } as any
                      )[action]}
                  {!['RETURN', 'REJECT_COMMITTEE'].includes(action) && <ArrowRight size={14} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
