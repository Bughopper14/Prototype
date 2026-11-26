/** Empty state of the Documents tab before any signed FAP form is uploaded (Redesign 2, Screen 1). */
import {useRef, useState} from 'react';
import {ArrowRight, CheckSquare, Loader2, Upload} from 'lucide-react';
import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function FapEmptyUploadView({onOpenChecklist}: {onOpenChecklist?: () => void}) {
  const {a, busy, canUpload, activeItem, handleFileUpload} = useDocumentsStudioContext();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Count required checklist documents (excluding FAP itself) that are already verified/approved
  const otherChecks = (a.documentChecks || []).filter((d: any) => d.documentCode !== 'FAP' && d.required !== false);
  const requiredCount = otherChecks.length || 4;
  const verifiedCount = otherChecks.filter(
    (d: any) => d.approvalStatus === 'APPROVED' || d.status === 'APPROVED' || d.status === 'VERIFIED',
  ).length;
  const allVerified = requiredCount > 0 && verifiedCount >= requiredCount;

  const pickFile = (file?: File | null) => {
    if (!file || busy || !canUpload) return;
    handleFileUpload(activeItem, file);
  };

  return (
    <div className="fap-r2-empty-wrap">
      <section className="fap-r2-card">
        <div className="fap-r2-empty-head">
          <div>
            <h3>Signed FAP form (customer-signed)</h3>
            <p>Upload the FAP form the customer signed. OCR reads it and compares every field with the data in the system.</p>
          </div>
          <span className="fap-r2-pill muted">Not uploaded</span>
        </div>

        <div
          className={`fap-r2-dropzone ${dragging ? 'is-dragging' : ''} ${!canUpload ? 'is-disabled' : ''}`}
          onDragOver={e => {
            if (!canUpload || busy) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setDragging(false);
            if (!canUpload || busy) return;
            pickFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => {
            if (canUpload && !busy) inputRef.current?.click();
          }}
        >
          <div className="fap-r2-drop-icon">
            {busy ? <Loader2 size={22} className="spin" /> : <Upload size={22} />}
          </div>
          <div className="fap-r2-drop-title">
            {busy ? 'Uploading and reading form with OCR…' : 'Drop the signed FAP form here, or browse'}
          </div>
          <div className="fap-r2-drop-hint">PDF, PNG or JPEG (up to 20 MB)</div>
          {canUpload && (
            <button
              type="button"
              className="fap-r2-btn-navy"
              disabled={busy}
              onClick={e => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              {busy ? 'Uploading…' : 'Browse file'}
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            style={{display: 'none'}}
            disabled={busy || !canUpload}
            onChange={e => {
              pickFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      <div className="fap-r2-checklist-bar">
        <div className="fap-r2-checklist-bar-left">
          <CheckSquare size={16} color="#475569" />
          <span>Other FAP documents (NIB, NPWP, KTP, deed) are uploaded in Document Checklist</span>
          <span className={`fap-r2-checklist-count ${allVerified ? 'done' : ''}`}>
            {verifiedCount} / {requiredCount} required verified
          </span>
        </div>
        {onOpenChecklist && (
          <button type="button" className="fap-r2-checklist-link" onClick={onOpenChecklist}>
            Open Document Checklist <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
