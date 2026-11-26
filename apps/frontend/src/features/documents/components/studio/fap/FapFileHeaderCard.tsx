/** Compact top file card shown after a signed FAP form has been uploaded (Redesign 2, Screens 2-5). */
import {useRef, useState} from 'react';
import {CheckSquare, ExternalLink, FileText, Loader2, ScanLine, Upload} from 'lucide-react';
import {ConfirmUploadBubble} from '@/shared/ui/ConfirmUploadBubble';
import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

function formatUploadedAt(raw?: string) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
  const time = d.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', hour12: false});
  return `${day}, ${time}`;
}

export function FapFileHeaderCard() {
  const {
    busy,
    activeItem,
    activeFiles,
    activeFile,
    activeFileUrl,
    canUpload,
    isFapOcrScanning,
    fapComparison,
    setShowHistoryModal,
    handleFileUpload,
    handleRunFapComparison,
  } = useDocumentsStudioContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const isApproved =
    activeItem.chk?.approvalStatus === 'APPROVED' || activeItem.chk?.approval?.state === 'APPROVED';

  const statusPill = isFapOcrScanning
    ? {label: 'Scanning…', tone: 'info'}
    : isApproved || (fapComparison && !fapComparison.hasDifferences)
      ? {label: 'Verified', tone: 'verified'}
      : {label: 'Needs review', tone: 'warn'};

  const uploadedDate = formatUploadedAt(activeFile?.uploadedAt || activeFile?.createdAt);
  const uploadedBy = activeFile?.uploadedByName || activeFile?.uploadedBy || activeFile?.createdBy || '';
  const metaParts = [
    activeFile?.fileName || 'Signed FAP',
    uploadedDate ? `uploaded ${uploadedDate}${uploadedBy ? ` by ${uploadedBy}` : ''}` : uploadedBy ? `by ${uploadedBy}` : '',
  ].filter(Boolean);

  const onSelectFile = (f: File) => {
    if (isApproved) {
      setPendingFile(f);
      setConfirmOpen(true);
    } else {
      handleFileUpload(activeItem, f);
    }
  };

  return (
    <section className="fap-r2-file-card">
      <div className="fap-r2-file-left">
        <div className="fap-r2-file-icon">
          <FileText size={19} />
        </div>
        <div className="fap-r2-file-info">
          <div className="fap-r2-file-title-row">
            <h3>Signed FAP form (customer-signed)</h3>
            <span className={`fap-r2-pill ${statusPill.tone}`}>{statusPill.label}</span>
          </div>
          <p title={metaParts.join(' — ')}>{metaParts.join(' — ')}</p>
        </div>
      </div>

      <div className="fap-r2-file-actions">
        {activeFileUrl && (
          <a
            href={activeFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fap-r2-btn-outline"
            style={{textDecoration: 'none'}}
            title="Open original uploaded file in a new tab"
          >
            <ExternalLink size={14} />
            <span>Original file</span>
          </a>
        )}

        <button type="button" className="fap-r2-btn-outline" onClick={() => setShowHistoryModal(true)}>
          <CheckSquare size={14} />
          <span>Upload history ({activeFiles.length})</span>
        </button>

        <button
          type="button"
          className="fap-r2-btn-outline"
          disabled={busy || isFapOcrScanning}
          onClick={handleRunFapComparison}
        >
          {busy || isFapOcrScanning ? <Loader2 size={14} className="spin" /> : <ScanLine size={14} />}
          <span>Re-scan OCR</span>
        </button>

        {canUpload && (
          <>
            <button
              type="button"
              className="fap-r2-btn-outline"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              <span>Replace file</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              style={{display: 'none'}}
              disabled={busy}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) onSelectFile(f);
                e.target.value = '';
              }}
            />
          </>
        )}
      </div>

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
    </section>
  );
}
