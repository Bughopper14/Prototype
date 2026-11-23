/** FAP diff panel: verification remarks editor. */
import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';
import {FapRemarksTinyMCE} from '@/features/fap/components/FapRemarksTinyMCE';
import {CheckCircle, FileText, Loader2} from 'lucide-react';

export function FapVerificationRemarks() {
  const {
    a,
    isFapLocked,
    busy,
    fapComparison,
    fapRemarks,
    setFapRemarks,
    remarksSaveStatus,
    setRemarksSaveStatus,
  } = useDocumentsStudioContext();
  // remarks are written on the current file while the stage is not submitted; otherwise they are only read
  const readOnly = isFapLocked || fapComparison?.isCurrent === false;
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
        </div>
      </div>

      <FapRemarksTinyMCE
        key={`${a.id}-${fapComparison?.fileId || 'fap'}-${readOnly ? 'ro' : 'rw'}`}
        initialContent={fapRemarks}
        disabled={busy || readOnly}
        onChange={content => {
          setFapRemarks(content);
          setRemarksSaveStatus('unsaved');
        }}
      />
    </div>
  );
}
