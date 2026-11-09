/** FAP view: upload banner / dropzone (or locked notice) with upload-history button. */
import {Badge} from '@/shared/ui/Badge';
import {Files, Loader2, Lock, UploadCloud} from 'lucide-react';

import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function FapUploadBanner() {
  const {isFapLocked, busy, setShowHistoryModal, activeItem, activeFiles, canUpload, handleFileUpload} =
    useDocumentsStudioContext();
  return (
    <div className="fap-evidence-full-top">
      <div className="fap-evidence-top-header">
        <div className="fap-evidence-top-title-area">
          <div className="fap-evidence-top-icon">
            <UploadCloud size={20} />
          </div>
          <div className="fap-evidence-top-text">
            <h3>Upload Signed FAP Form Evidence (Customer Signed)</h3>
            <p>
              Upload a scanned file or PDF of the physically signed FAP form for automatic OCR verification.
            </p>
          </div>
        </div>
        <div className="fap-evidence-top-actions">
          <button
            type="button"
            className="fap-history-popup-btn"
            onClick={() => setShowHistoryModal(true)}
            title="Open the list of uploaded FAP document history"
          >
            <Files size={15} color="#002060" />
            <span>Upload History ({activeFiles.length})</span>
          </button>
          <Badge status={activeItem.chk.status || (activeFiles.length ? 'UPLOADED' : 'PENDING')} />
        </div>
      </div>

      {/* Full-width Dropzone or Locked Banner */}
      {isFapLocked ? (
        <div
          className="stage-readonly-banner"
          style={{
            margin: '0 0 16px 0',
            background: '#ecfdf5',
            borderColor: '#a7f3d0',
            color: '#065f46',
            borderRadius: '8px',
          }}
        >
          <Lock size={18} />
          <span>
            <strong>FAP Document Locked:</strong> Application is now in <strong>Pre-analysis</strong> stage.
            Physical FAP document has been verified and approved. FAP document file is permanently locked
            (cannot be re-uploaded or deleted).
          </span>
        </div>
      ) : (
        canUpload && (
          <label className="fap-dropzone-full" onClick={e => e.stopPropagation()}>
            <div className="fap-dropzone-full-icon">
              {busy ? <Loader2 size={22} className="spin" /> : <UploadCloud size={22} />}
            </div>
            <strong>
              {busy
                ? 'Uploading and processing OCR...'
                : 'Drag & drop FAP PDF/Image file here, or click to select a file'}
            </strong>
            <span>Files are automatically named with application hash and date stamp</span>
            <span className="fap-dropzone-full-hint">
              Supported formats: PDF, PNG, JPEG · Max 20 MB · Automatic system data vs OCR comparison
            </span>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              disabled={busy}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(activeItem, f);
                e.target.value = '';
              }}
            />
          </label>
        )
      )}
    </div>
  );
}
