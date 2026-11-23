/** FAP diff panel: approve / apply / locked actions bar. */
import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';
import {Modal} from '@/shared/ui/Modal';
import {FapSubmitPlan} from '@/features/documents/components/studio/fap/FapSubmitPlan';
import {CheckCircle, Loader2, Lock, Pencil} from 'lucide-react';

export function FapDiffActions() {
  const {
    a,
    isFapLocked,
    busy,
    fapComparison,
    confirmApproveFapOpen,
    setConfirmApproveFapOpen,
    handleApproveFapChanges,
    handleDismissFapChanges,
  } = useDocumentsStudioContext();
  return (
    <>
      {fapComparison &&
        (isFapLocked ? (
          <div
            className="fap-diff-actions-bar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              background: '#ecfdf5',
              padding: '12px 18px',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              marginTop: '14px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '12.5px',
                color: '#065f46',
                lineHeight: 1.4,
                flex: 1,
                minWidth: '280px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Lock size={16} /> The FAP Stage has been submitted. Its data is locked while the approval runs.
            </span>
            <div
              className="fap-diff-actions-right"
              style={{display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0}}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#059669',
                  fontWeight: 600,
                  fontSize: '13px',
                  background: '#ffffff',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #a7f3d0',
                }}
              >
                <CheckCircle size={15} /> FAP Stage Submitted (Locked)
              </span>
            </div>
          </div>
        ) : (
          <>
            <FapSubmitPlan application={a} />
            <div
              className="fap-diff-actions-bar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                background: '#f8fafc',
                padding: '12px 18px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                marginTop: '14px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: '12.5px',
                  color: '#475569',
                  lineHeight: 1.4,
                  flex: 1,
                  minWidth: '280px',
                }}
              >
                Physical FAP document discrepancies are recorded in the Remarks section above. Submitting the
                FAP Stage will <strong>NOT alter system/database records</strong>, will{' '}
                <strong>lock Customer &amp; PIC details</strong> and starts the approvals listed above.
              </span>
              <div
                className="fap-diff-actions-right"
                style={{display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0}}
              >
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={handleDismissFapChanges}
                  style={{display: 'inline-flex', alignItems: 'center', gap: '6px'}}
                  title="Save remarks notes and stay on the current document"
                >
                  <Pencil size={14} /> Review Remarks / Stay on Document
                </button>
                <button
                  type="button"
                  className="button primary"
                  disabled={busy}
                  onClick={() => setConfirmApproveFapOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#059669',
                    borderColor: '#059669',
                  }}
                  title="Submit the FAP Stage and lock Customer & PIC details"
                >
                  {busy ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />}
                  Submit FAP Stage (Lock Customer &amp; PIC)
                </button>
              </div>
            </div>
            {confirmApproveFapOpen && (
              <Modal title="Confirm FAP Stage Submit" onClose={() => setConfirmApproveFapOpen(false)}>
                <div
                  className="modal-body"
                  style={{minWidth: '320px', maxWidth: '480px', padding: '24px 28px'}}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '14px',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircle size={22} />
                    </div>
                    <div>
                      <h3 style={{margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a'}}>
                        Are you sure?
                      </h3>
                      <p style={{margin: '4px 0 0', fontSize: '12px', color: '#64748b'}}>
                        {[a.customer?.companyName || 'Company', a.fapNumber].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: '13.5px',
                      color: '#334155',
                      lineHeight: 1.6,
                      margin: '0 0 12px',
                    }}
                  >
                    Are you sure you want to submit the FAP Stage with this physical FAP document?
                  </p>
                  <p
                    style={{
                      fontSize: '12.5px',
                      color: '#64748b',
                      lineHeight: 1.5,
                      margin: 0,
                      background: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    Customer &amp; PIC sections will be locked and the approvals of the stage will start. The
                    discrepancies stay recorded in the remarks.
                  </p>
                </div>
                <div
                  className="modal-actions"
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    padding: '16px 24px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  <button
                    type="button"
                    className="button"
                    onClick={() => setConfirmApproveFapOpen(false)}
                    disabled={busy}
                    style={{minWidth: '80px', fontWeight: 600}}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className="button primary"
                    disabled={busy}
                    onClick={async () => {
                      setConfirmApproveFapOpen(false);
                      await handleApproveFapChanges();
                    }}
                    style={{
                      minWidth: '90px',
                      background: '#059669',
                      borderColor: '#059669',
                      fontWeight: 600,
                    }}
                  >
                    {busy ? <Loader2 size={15} className="spin" /> : <CheckCircle size={15} />}
                    Yes
                  </button>
                </div>
              </Modal>
            )}
          </>
        ))}
    </>
  );
}
