/** Stage transition buttons on the Documents / Activity tabs. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {ArrowRight, Lock} from 'lucide-react';

export function StageActionsBar() {
  const {
    setSubmitFapConfirm,
    tab,
    setError,
    setTransition,
    setComments,
    isFapStage,
    isSubmitLocked,
    actions,
  } = useWorkspace();
  return (
    <>
      {tab > 6 && tab !== 8 && actions.length > 0 && (
        <div className="form-bottom-actions">
          <div className="form-bottom-left"></div>
          <div className="form-bottom-right">
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
                      {
                        (
                          {
                            SUBMIT_TO_BS: 'Submit',
                            VERIFY_BS: 'Complete BS verification',
                            START_REVIEW: 'Start CA & Legal review',
                            RECOMMEND_CA: 'Sign off · CA',
                            RECOMMEND_LEGAL: 'Sign off · Legal',
                            APPROVE_COMMITTEE: 'Approve',
                            REJECT_COMMITTEE: 'Reject',
                            RETURN: 'Return',
                          } as any
                        )[action]
                      }
                      {!['RETURN', 'REJECT_COMMITTEE'].includes(action) && <ArrowRight size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
