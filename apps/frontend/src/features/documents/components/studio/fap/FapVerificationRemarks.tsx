/** FAP diff panel: verification remarks editor. */
import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';
import {FapRemarksTinyMCE} from '@/features/fap/components/FapComparisonModal';
import {CheckCircle, FileText, Loader2, Save} from 'lucide-react';

export function FapVerificationRemarks() {
  const {
    a,
    busy,
    fapComparison,
    fapRemarks,
    setFapRemarks,
    remarksSaveStatus,
    setRemarksSaveStatus,
    handleSaveFapRemarks,
  } = useDocumentsStudioContext();
  return (
    <div className="fap-diff-remarks-card">
      <div className="fap-diff-remarks-head">
        <div className="fap-diff-remarks-title">
          <div className="fap-diff-remarks-title-icon">
            <FileText size={16} />
          </div>
          <div className="fap-diff-remarks-title-text">
            <h4>FAP Document Verification Notes & Remarks</h4>
            <p>
              Use this section to add verification notes (e.g. clarifying OCR discrepancies, documenting
              approved changes or addendums, or other verification justifications).
            </p>
          </div>
        </div>
        <div className="fap-diff-remarks-actions">
          {remarksSaveStatus === 'saved' && (
            <span
              style={{
                fontSize: '11.5px',
                color: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 500,
              }}
            >
              <CheckCircle size={13} /> Saved
            </span>
          )}
          {remarksSaveStatus === 'saving' && (
            <span
              style={{
                fontSize: '11.5px',
                color: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Loader2 size={13} className="spin" /> Saving...
            </span>
          )}
          <button
            type="button"
            className="button small"
            disabled={busy || remarksSaveStatus === 'saving'}
            onClick={handleSaveFapRemarks}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              padding: '4px 12px',
              height: '28px',
            }}
            title="Save verification remarks"
          >
            <Save size={13} /> Save Remarks
          </button>
        </div>
      </div>

      <FapRemarksTinyMCE
        key={`${a.id}-${fapComparison?.fileName || 'fap'}`}
        initialContent={fapRemarks}
        disabled={busy}
        onChange={content => {
          setFapRemarks(content);
          setRemarksSaveStatus('unsaved');
        }}
      />
    </div>
  );
}
