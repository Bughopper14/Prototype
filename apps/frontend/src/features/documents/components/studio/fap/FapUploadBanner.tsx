/** FAP view: upload banner / dropzone (or locked notice) with upload-history button. */
import {useState} from 'react';
import {Badge} from '@/shared/ui/Badge';
import {Files, Loader2, UploadCloud} from 'lucide-react';
import {ConfirmUploadBubble} from '@/shared/ui/ConfirmUploadBubble';

import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function FapUploadBanner() {
  const {busy, setShowHistoryModal, activeItem, activeFiles, canUpload, handleFileUpload} =
    useDocumentsStudioContext();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const isApproved =
    activeItem.chk?.approvalStatus === 'APPROVED' ||
    activeItem.chk?.approval?.state === 'APPROVED';

  const onFileChange = (f: File) => {
    if (isApproved) {
      setPendingFile(f);
      setConfirmOpen(true);
    } else {
      handleFileUpload(activeItem, f);
    }
  };

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
          <Badge status={activeItem.chk.approvalStatus && activeItem.chk.approvalStatus !== 'NOT_STARTED' ? activeItem.chk.approvalStatus : activeItem.chk.status || (activeFiles.length ? 'UPLOADED' : 'PENDING')} />
        </div>
      </div>

      {/* Full-width Dropzone */}
      {canUpload && (
        <label className="fap-dropzone-full" onClick={e => e.stopPropagation()}>
          <div className="fap-dropzone-full-icon">
            {busy ? <Loader2 size={22} className="spin" /> : <UploadCloud size={22} />}
          </div>
          <strong>
            {busy
              ? 'Uploading and processing OCR...'
              : 'Drag & drop FAP PDF/Image file here, or click to select a file'}
          </strong>
          <span className="fap-dropzone-full-hint">
            Supported formats: PDF, PNG, JPEG · Max 20 MB · Automatic system data vs OCR comparison
          </span>
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            disabled={busy}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onFileChange(f);
              e.target.value = '';
            }}
          />
        </label>
      )}

      <ConfirmUploadBubble
        open={confirmOpen}
        title="Are you sure?"
        message="This FAP document has already been approved. Uploading a new file will restart the approval process for this document."
        onCancel={() => {
          setPendingFile(null);
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (pendingFile) {
            handleFileUpload(activeItem, pendingFile);
            setPendingFile(null);
          }
          setConfirmOpen(false);
        }}
        placement="center"
      />
    </div>
  );
}
