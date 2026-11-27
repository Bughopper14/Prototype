import {PreAnalysisForm} from '@/features/crm/components/lazy';
import {api} from '@/shared/lib/api';
import {hasAuthority} from '@/shared/lib/auth';
import {Modal} from '@/shared/ui/Modal';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  History,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Send,
  Upload,
} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import './PreAnalysisDocumentsView.css';

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

function stripHtml(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

export function PreAnalysisDocumentsView({
  a,
  user,
  onChange,
  notify,
  onOpenChecklist,
}: {
  a: any;
  user: any;
  onChange: (updated: any) => void;
  notify: (msg: string) => void;
  onOpenChecklist?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<{code: string; time: string} | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const docs: any[] = Array.isArray(a?.documentChecks)
    ? a.documentChecks
    : Array.isArray(a?.documents)
      ? a.documents
      : [];
  const preDoc =
    docs.find(d => ['PRE-ANALYSIS', 'PREANALYSIS', 'PRE_ANALYSIS'].includes((d.stageCode || '').toUpperCase())) ||
    docs.find(d => (d.documentCode || '').includes('PRE_ANALYSIS') || (d.documentCode || '').includes('PREANALYSIS')) ||
    null;

  const files: any[] = preDoc?.files || [];
  const currentFile = files.find(f => f.isCurrent) || files[files.length - 1] || null;

  const approval = preDoc?.approval || null;
  const approvalStatus = preDoc?.approvalStatus || approval?.state || 'NOT_STARTED';
  const isInApproval = approvalStatus === 'IN_APPROVAL';
  const isApproved = approvalStatus === 'APPROVED';
  const isRejected = approvalStatus === 'REJECTED';
  const isUploaded = !!currentFile;

  const canUpload =
    (hasAuthority(user, 'CRM_DOCUMENT_UPLOAD') ||
      hasAuthority(user, 'CRM_APPLICATION_CREATE') ||
      hasAuthority(user, 'CRM_APPLICATION_EDIT')) &&
    !isInApproval;
  const canSubmit = hasAuthority(user, 'CRM_WORKFLOW_SUBMIT') && isUploaded && (approvalStatus === 'NOT_STARTED' || isRejected);

  const steps: any[] = approval?.steps || [];

  const statusLabel = isApproved
    ? 'Verified'
    : isInApproval
      ? 'Waiting for approval'
      : isRejected
        ? 'Needs changes'
        : isUploaded
          ? 'Uploaded'
          : 'Not uploaded';

  const statusClass = isApproved
    ? 'is-approved'
    : isInApproval
      ? 'is-in-approval'
      : isRejected
        ? 'is-rejected'
        : isUploaded
          ? 'is-uploaded'
          : '';

  const loadPreview = useCallback(async (fileId: string) => {
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const res = await api(`/files/${fileId}/url`);
      if (!res?.url) {
        setPreviewUrl('');
        setPreviewError({code: 'Error 404', time: formatUploadedDate(new Date().toISOString())});
        return;
      }
      const probe = await fetch(res.url, {credentials: 'same-origin'});
      if (!probe.ok) {
        setPreviewUrl('');
        setPreviewError({
          code: `Error ${probe.status}`,
          time: formatUploadedDate(new Date().toISOString()),
        });
        return;
      }
      const blob = await probe.blob();
      if (!blob || blob.size === 0) {
        setPreviewUrl('');
        setPreviewError({code: 'Corrupted file', time: formatUploadedDate(new Date().toISOString())});
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(prev => {
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return objectUrl;
      });
    } catch {
      setPreviewUrl('');
      setPreviewError({code: 'Error 500', time: formatUploadedDate(new Date().toISOString())});
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  // Automatically load inline preview URL when a file is uploaded
  useEffect(() => {
    if (!currentFile?.id) {
      setPreviewUrl(prev => {
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return '';
      });
      setPreviewError(null);
      return;
    }
    loadPreview(currentFile.id);
  }, [currentFile?.id, loadPreview]);

  async function handleFileUpload(file: File) {
    if (!preDoc) {
      setError('Pre-analysis document checklist item was not found on this application.');
      return;
    }
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Upload a valid PDF, PNG or JPEG file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Maximum file size is 20 MB.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('checklistId', preDoc.id);
      form.append('documentCode', preDoc.documentCode || 'PRE_ANALYSIS_DOC');
      await api(`/applications/${a.id}/documents/upload`, 'POST', form);
      const refreshed = await api(`/applications/${a.id}`);
      onChange(refreshed);
      notify(`Uploaded ${file.name}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload Pre-analysis document.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownloadFile(fileId: string) {
    setError('');
    try {
      const res = await api(`/files/${fileId}/url?download=1`);
      if (res?.url) {
        const link = document.createElement('a');
        link.href = res.url;
        link.download = '';
        link.click();
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to download document.');
    }
  }

  async function handleViewFile(fileId: string) {
    setError('');
    try {
      const res = await api(`/files/${fileId}/url`);
      if (res?.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to open document.');
    }
  }

  async function handleSubmitForApproval() {
    if (!preDoc) return;
    setSubmitting(true);
    setError('');
    try {
      const updated = await api(`/applications/${a.id}/documents/${preDoc.id}/submit-approval`, 'POST', {});
      onChange(updated);
      notify(`${preDoc.documentName || 'Pre-analysis document'} sent for approval`);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit document for approval.');
    } finally {
      setSubmitting(false);
    }
  }

  const isPdf =
    currentFile?.mimeType === 'application/pdf' ||
    String(currentFile?.fileName || '').toLowerCase().endsWith('.pdf');

  return (
    <div className="prea-docs-wrap">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        style={{display: 'none'}}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFileUpload(f);
          e.target.value = '';
        }}
      />

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {/* Top Header Card */}
      <div className="prea-docs-header-card">
        <div className="prea-docs-header-left">
          <div className="prea-docs-icon-box">
            <FileText size={18} />
          </div>
          <div>
            <div className="prea-docs-title-row">
              <h3 className="prea-docs-title">
                Pre-analysis document · {preDoc?.documentName || 'Lembar Dokumen Pra-Analisis Kredit'}
              </h3>
              <span className={`prea-docs-status-pill ${statusClass}`}>{statusLabel}</span>
            </div>
            <p className="prea-docs-subtitle">
              {currentFile ? (
                <>
                  {currentFile.fileName} · {formatBytes(currentFile.fileSize)}
                  {currentFile.createdAt ? ` · uploaded ${formatUploadedDate(currentFile.createdAt)}` : ''}
                  {currentFile.uploadedBy ? ` by ${currentFile.uploadedBy}` : ''}
                </>
              ) : (
                'Credit worthiness worksheet, business evaluation and scoring by Credit Analyst · verified by Credit Analyst'
              )}
            </p>
          </div>
        </div>

        {currentFile ? (
          <div className="prea-docs-file-actions">
            <button
              type="button"
              className="prea-docs-btn"
              onClick={() => setHistoryOpen(true)}
            >
              <History size={14} />
              <span>Upload history ({files.length})</span>
            </button>
            <button
              type="button"
              className="prea-docs-btn"
              onClick={() => handleDownloadFile(currentFile.id)}
            >
              <Download size={14} />
              <span>Download</span>
            </button>
            {canUpload && (
              <button
                type="button"
                className="prea-docs-btn"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} />
                <span>{uploading ? 'Uploading...' : 'Replace file'}</span>
              </button>
            )}
            {canSubmit && (
              <button
                type="button"
                className="prea-docs-btn prea-docs-btn--primary"
                disabled={submitting}
                onClick={handleSubmitForApproval}
              >
                <Send size={14} />
                <span>{submitting ? 'Submitting...' : 'Submit for approval'}</span>
              </button>
            )}
          </div>
        ) : null}
      </div>

      {isRejected && preDoc?.approvalRemarks && (
        <div className="prea-docs-remarks">
          <strong>Needs changes:</strong> {stripHtml(preDoc.approvalRemarks)}
        </div>
      )}

      {/* Uploaded state -> 50/50 Comparison: Left = System Pre-Analysis Form, Right = Uploaded Document */}
      {currentFile ? (
        <div className="prea-docs-comparison-grid">
          {/* Left Pane (50%): System Pre-Analysis Form */}
          <div className="prea-docs-preview-card">
            <div className="prea-docs-preview-toolbar">
              <span className="prea-docs-preview-filename">
                System Pre-Analysis Form (Live Data)
              </span>
              <span style={{fontSize: 12, color: '#64748b'}}>
                {a?.preAnalysisNumber || a?.applicationNumber || ''}
              </span>
            </div>
            <div className="prea-docs-form-scroll">
              <PreAnalysisForm
                key={`prea-doc-compare-${a.id}`}
                applicationId={a.id}
                application={a}
                isNew={false}
                busy={false}
                onChange={() => {}}
                onApplicationChange={onChange}
                customer={a.customer}
                pic={a.pic}
                profile={a}
              />
            </div>
          </div>

          {/* Right Pane (50%): Uploaded Pre-Analysis Document */}
          <div className={`prea-docs-preview-card ${fullscreen ? 'is-fullscreen' : ''}`}>
          <div className="prea-docs-preview-toolbar">
            <span className="prea-docs-preview-filename">{currentFile.fileName}</span>
            <div className="prea-docs-preview-controls">
              {!isPdf && (
                <>
                  <button
                    type="button"
                    className="prea-docs-zoom-btn"
                    onClick={() => setZoom(z => Math.max(50, z - 25))}
                    title="Zoom out"
                  >
                    <Minus size={13} />
                  </button>
                  <button
                    type="button"
                    className="prea-docs-zoom-btn"
                    onClick={() => setZoom(100)}
                    title="Fit width"
                  >
                    {zoom === 100 ? 'Fit width' : `${zoom}%`}
                  </button>
                  <button
                    type="button"
                    className="prea-docs-zoom-btn"
                    onClick={() => setZoom(z => Math.min(200, z + 25))}
                    title="Zoom in"
                  >
                    <Plus size={13} />
                  </button>
                </>
              )}
              <button
                type="button"
                className="prea-docs-zoom-btn"
                onClick={() => setFullscreen(f => !f)}
              >
                {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span style={{marginLeft: 5}}>{fullscreen ? 'Exit full screen' : 'Full screen'}</span>
              </button>
            </div>
          </div>

          <div className="prea-docs-preview-canvas">
            {loadingPreview ? (
              <div style={{color: '#64748b', fontSize: 13}}>Loading preview...</div>
            ) : previewUrl && !previewError ? (
              isPdf ? (
                <iframe
                  src={previewUrl}
                  title={currentFile.fileName}
                  className="prea-docs-preview-iframe"
                  onError={() =>
                    setPreviewError({code: 'Preview error', time: formatUploadedDate(new Date().toISOString())})
                  }
                />
              ) : (
                <img
                  src={previewUrl}
                  alt={currentFile.fileName}
                  className="prea-docs-preview-img"
                  style={{width: `${zoom}%`}}
                  onError={() =>
                    setPreviewError({code: 'Corrupted image', time: formatUploadedDate(new Date().toISOString())})
                  }
                />
              )
            ) : (
              <div className="prea-docs-preview-error">
                <div className="prea-docs-error-circle">
                  <FileText size={20} />
                </div>
                <div className="prea-docs-error-title">This file can't be previewed right now</div>
                <div className="prea-docs-error-desc">
                  The preview server did not respond or the file may be corrupted. The file itself is safe — you can download it or try again.
                </div>
                <div className="prea-docs-error-actions">
                  <button
                    type="button"
                    className="prea-docs-btn"
                    onClick={() => currentFile?.id && loadPreview(currentFile.id)}
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    className="prea-docs-btn prea-docs-btn--primary"
                    onClick={() => currentFile?.id && handleDownloadFile(currentFile.id)}
                  >
                    <Download size={14} />
                    <span>Download file</span>
                  </button>
                </div>
                {previewError && (
                  <div className="prea-docs-error-meta">
                    {previewError.code} · {previewError.time}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      ) : (
        /* Not uploaded state -> Dropzone + Who Verifies + Bottom Helper */
        <>
          <div className="prea-docs-main-card">
            <div
              className={`prea-docs-dropzone ${dragOver ? 'is-dragover' : ''}`}
              onClick={() => canUpload && !uploading && fileInputRef.current?.click()}
              onDragOver={e => {
                if (!canUpload) return;
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                if (!canUpload) return;
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f && !uploading) handleFileUpload(f);
              }}
            >
              <div className="prea-docs-drop-circle">
                <Download size={18} />
              </div>
              <div className="prea-docs-drop-title">Drop the Pre-analysis document here, or browse</div>
              <div className="prea-docs-drop-hint">PDF, PNG or JPEG · up to 20 MB</div>
              {canUpload && (
                <button
                  type="button"
                  className="prea-docs-browse-btn"
                  disabled={uploading}
                  onClick={e => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  {uploading ? 'Uploading...' : 'Browse file'}
                </button>
              )}
            </div>

            {/* Who Verifies After Upload */}
            <div className="prea-docs-verify-section">
              <div className="prea-docs-verify-title">WHO VERIFIES AFTER UPLOAD</div>
              {steps.length > 0 ? (
                steps.map((st: any, idx: number) => {
                  const role = st.authorityName?.match(/_([A-Za-z0-9]+)_(?:APPROVE|REVIEW|VERIFY)$/i)?.[1] || st.name || 'CA';
                  const stepApproved = st.status === 'APPROVED';
                  const stepPending = st.status === 'PENDING';
                  return (
                    <div key={st.id || idx} className="prea-docs-verify-row">
                      <span className="prea-docs-level-label">L{st.order ?? idx + 1}</span>
                      <span
                        className={`prea-docs-role-pill ${
                          stepApproved ? 'is-approved' : stepPending ? 'is-pending' : ''
                        }`}
                      >
                        {stepApproved ? (
                          <CheckCircle2 size={12} />
                        ) : stepPending ? (
                          <Clock size={12} />
                        ) : (
                          <Circle size={11} />
                        )}
                        <span>{role}</span>
                      </span>
                      <span>{st.name || 'Credit Analyst checks the worksheet and scoring'}</span>
                    </div>
                  );
                })
              ) : (
                <div className="prea-docs-verify-row">
                  <span className="prea-docs-level-label">L1</span>
                  <span className="prea-docs-role-pill">
                    <Circle size={11} />
                    <span>CA</span>
                  </span>
                  <span>Credit Analyst checks the worksheet and scoring</span>
                </div>
              )}
            </div>
          </div>

          <div className="prea-docs-footer-banner">
            <div className="prea-docs-footer-left">
              <FileCheck2 size={15} color="#64748b" />
              <span>This is the only document needed for Pre-analysis. It also appears in Document Checklist.</span>
            </div>
            {onOpenChecklist && (
              <button type="button" className="prea-docs-footer-link" onClick={onOpenChecklist}>
                <span>Open Document Checklist</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </>
      )}

      {/* Upload History Modal */}
      {historyOpen && (
        <Modal title={`Upload History (${files.length})`} onClose={() => setHistoryOpen(false)}>
          <div className="prea-docs-history-list">
            {[...files].reverse().map((f: any, idx: number) => (
              <div key={f.id || idx} className="prea-docs-history-item">
                <div>
                  <div className="prea-docs-file-name">
                    {f.fileName} {f.isCurrent ? '(Current)' : ''}
                  </div>
                  <div className="prea-docs-file-sub">
                    {formatBytes(f.fileSize)}
                    {f.createdAt ? ` · ${formatUploadedDate(f.createdAt)}` : ''}
                    {f.uploadedBy ? ` · ${f.uploadedBy}` : ''}
                  </div>
                </div>
                <div style={{display: 'flex', gap: 6}}>
                  <button
                    type="button"
                    className="prea-docs-btn"
                    onClick={() => handleViewFile(f.id)}
                  >
                    <ExternalLink size={13} />
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    className="prea-docs-btn"
                    onClick={() => handleDownloadFile(f.id)}
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
