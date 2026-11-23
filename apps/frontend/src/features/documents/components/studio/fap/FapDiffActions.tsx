/** FAP diff panel: approve / apply / locked actions bar. */
import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';
import {FapSubmitPlan} from '@/features/documents/components/studio/fap/FapSubmitPlan';
import {CheckCircle, Loader2, Lock, Save} from 'lucide-react';

export function FapDiffActions() {
  const {
    a,
    isFapLocked,
    busy,
    fapComparison,
    onSubmitStage,
    handleSaveFapRemarks,
    remarksSaveStatus,
  } = useDocumentsStudioContext();
  return (
    <>
      {fapComparison &&
        fapComparison.isCurrent !== false &&
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
                justifyContent: 'flex-end',
                gap: '16px',
                background: '#f8fafc',
                padding: '12px 18px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                marginTop: '14px',
                flexWrap: 'wrap',
              }}
            >
              <div
                className="fap-diff-actions-right"
                style={{display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0}}
              >
                <button
                  type="button"
                  className="button"
                  disabled={busy || remarksSaveStatus === 'saving'}
                  onClick={handleSaveFapRemarks}
                  style={{display: 'inline-flex', alignItems: 'center', gap: '6px'}}
                  title="Save the verification remarks of this document"
                >
                  {remarksSaveStatus === 'saving' ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save Remarks
                </button>
                <button
                  type="button"
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    // unsaved remarks are saved first, then the same Submit dialog as the Submit tab opens
                    if (remarksSaveStatus === 'unsaved') await handleSaveFapRemarks();
                    onSubmitStage?.();
                  }}
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
          </>
        ))}
    </>
  );
}
