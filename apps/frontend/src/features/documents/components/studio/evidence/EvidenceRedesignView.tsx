/**
 * Redesign 2 unified view for non-FAP evidence stages (Pre-analysis, ICLF, etc.):
 * Matches FapRedesignView's clean white card, Outfit typography, dropzone empty state,
 * compact file header card, and full-width document viewer (without OCR comparison).
 */
import {useRef, useState} from 'react';
import {
  ArrowRight,
  CheckSquare,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  RotateCw,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {ConfirmUploadBubble} from '@/shared/ui/ConfirmUploadBubble';
import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';
import {ViewerCanvas} from '@/features/documents/components/studio/evidence/ViewerCanvas';

function formatUploadedAt(raw?: string) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
  const time = d.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', hour12: false});
  return `${day}, ${time}`;
}

export function EvidenceRedesignView({onOpenChecklist}: {onOpenChecklist?: () => void}) {
  const {
    a,
    busy,
    canUpload,
    activeItem,
    activeFiles,
    activeFile,
    activeFileUrl,
    zoom,
    setZoom,
    setRotation,
    setShowHistoryModal,
    handleFileUpload,
  } = useDocumentsStudioContext();

  const [dragging, setDragging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const emptyInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const stageTitle = activeItem.title || activeItem.name || activeItem.stage || 'Stage document';
  const stageDesc =
    activeItem.desc ||
    `Upload the signed ${activeItem.stage || 'stage'} document for review and verification.`;

  const isApproved =
    activeItem.chk?.approvalStatus === 'APPROVED' || activeItem.chk?.approval?.state === 'APPROVED';
  const isInApproval =
    activeItem.chk?.approvalStatus === 'IN_APPROVAL' || activeItem.chk?.approval?.state === 'IN_APPROVAL';

  const statusPill = isApproved
    ? {label: 'Verified', tone: 'verified'}
    : isInApproval
      ? {label: 'In review', tone: 'info'}
      : {label: 'Uploaded', tone: 'info'};

  // Count required checklist documents for this stage
  const stageChecks = (a.documentChecks || []).filter(
    (d: any) => (!activeItem.stageCode || d.stageCode === activeItem.stageCode) && d.documentCode !== activeItem.code && d.required !== false,
  );
  const requiredCount = stageChecks.length;
  const verifiedCount = stageChecks.filter(
    (d: any) => d.approvalStatus === 'APPROVED' || d.status === 'APPROVED' || d.status === 'VERIFIED',
  ).length;
  const allVerified = requiredCount > 0 && verifiedCount >= requiredCount;

  const onSelectFile = (f?: File | null) => {
    if (!f || busy || !canUpload) return;
    if (isApproved) {
      setPendingFile(f);
      setConfirmOpen(true);
    } else {
      handleFileUpload(activeItem, f);
    }
  };

  if (activeFiles.length === 0) {
    return (
      <div className="fap-r2-empty-wrap">
        <section className="fap-r2-card">
          <div className="fap-r2-empty-head">
            <div>
              <h3>{stageTitle}</h3>
              <p>{stageDesc}</p>
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
              onSelectFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => {
              if (canUpload && !busy) emptyInputRef.current?.click();
            }}
          >
            <div className="fap-r2-drop-icon">
              {busy ? <Loader2 size={22} className="spin" /> : <Upload size={22} />}
            </div>
            <div className="fap-r2-drop-title">
              {busy ? 'Uploading document…' : `Drop ${stageTitle} here, or browse`}
            </div>
            <div className="fap-r2-drop-hint">PDF, PNG or JPEG (up to 20 MB)</div>
            {canUpload && (
              <button
                type="button"
                className="fap-r2-btn-navy"
                disabled={busy}
                onClick={e => {
                  e.stopPropagation();
                  emptyInputRef.current?.click();
                }}
              >
                {busy ? 'Uploading…' : 'Browse file'}
              </button>
            )}
            <input
              ref={emptyInputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              style={{display: 'none'}}
              disabled={busy || !canUpload}
              onChange={e => {
                onSelectFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        </section>

        <div className="fap-r2-checklist-bar">
          <div className="fap-r2-checklist-bar-left">
            <CheckSquare size={16} color="#475569" />
            <span>Supporting documents for {activeItem.stage || 'this stage'} are managed in Document Checklist</span>
            {requiredCount > 0 && (
              <span className={`fap-r2-checklist-count ${allVerified ? 'done' : ''}`}>
                {verifiedCount} / {requiredCount} required verified
              </span>
            )}
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

  const uploadedDate = formatUploadedAt(activeFile?.uploadedAt || activeFile?.createdAt);
  const uploadedBy = activeFile?.uploadedByName || activeFile?.uploadedBy || activeFile?.createdBy || '';
  const metaParts = [
    activeFile?.fileName || stageTitle,
    uploadedDate ? `uploaded ${uploadedDate}${uploadedBy ? ` by ${uploadedBy}` : ''}` : uploadedBy ? `by ${uploadedBy}` : '',
  ].filter(Boolean);

  return (
    <div className="fap-r2-wrap">
      {/* Compact top file card */}
      <section className="fap-r2-file-card">
        <div className="fap-r2-file-left">
          <div className="fap-r2-file-icon">
            <FileText size={19} />
          </div>
          <div className="fap-r2-file-info">
            <div className="fap-r2-file-title-row">
              <h3>{stageTitle}</h3>
              <span className={`fap-r2-pill ${statusPill.tone}`}>{statusPill.label}</span>
            </div>
            <p title={metaParts.join(' — ')}>{metaParts.join(' — ')}</p>
          </div>
        </div>

        <div className="fap-r2-file-actions">
          <button type="button" className="fap-r2-btn-outline" onClick={() => setShowHistoryModal(true)}>
            <CheckSquare size={14} />
            <span>Upload history ({activeFiles.length})</span>
          </button>

          {canUpload && (
            <>
              <button
                type="button"
                className="fap-r2-btn-outline"
                disabled={busy}
                onClick={() => replaceInputRef.current?.click()}
              >
                <Upload size={14} />
                <span>Replace file</span>
              </button>
              <input
                ref={replaceInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                style={{display: 'none'}}
                disabled={busy}
                onChange={e => {
                  onSelectFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </div>
      </section>

      {/* Clean Document Preview Card */}
      <section className="fap-r2-card" style={{padding: 0, overflow: 'hidden'}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 18px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            flexWrap: 'wrap',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <span style={{fontSize: 13.5, fontWeight: 700, color: '#0f172a'}}>Document Preview</span>
            <span className="fap-r2-pill muted">Original file</span>
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <button
              type="button"
              className="fap-r2-btn-outline"
              style={{height: 30, padding: '0 8px'}}
              title="Zoom out"
              onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
            >
              <ZoomOut size={14} />
            </button>
            <span style={{fontSize: 12, fontWeight: 700, color: '#334155', minWidth: 42, textAlign: 'center'}}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="fap-r2-btn-outline"
              style={{height: 30, padding: '0 8px'}}
              title="Zoom in"
              onClick={() => setZoom(z => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              className="fap-r2-btn-outline"
              style={{height: 30, padding: '0 8px'}}
              title="Rotate 90°"
              onClick={() => setRotation(r => (r + 90) % 360)}
            >
              <RotateCw size={14} />
            </button>
            {activeFileUrl && (
              <>
                <a
                  href={activeFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="fap-r2-btn-outline"
                  style={{height: 30, padding: '0 10px', textDecoration: 'none'}}
                >
                  <ExternalLink size={13} />
                  <span>Open</span>
                </a>
                <a
                  href={activeFileUrl}
                  download={activeFile?.fileName || 'document'}
                  className="fap-r2-btn-outline"
                  style={{height: 30, padding: '0 10px', textDecoration: 'none'}}
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
              </>
            )}
          </div>
        </div>

        <div style={{height: 680, background: '#f1f5f9', display: 'flex', flexDirection: 'column'}}>
          <ViewerCanvas />
        </div>
      </section>

      <ConfirmUploadBubble
        open={confirmOpen}
        title="Are you sure?"
        message="This document has already been approved. Uploading a new file will restart the approval process for this document."
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
