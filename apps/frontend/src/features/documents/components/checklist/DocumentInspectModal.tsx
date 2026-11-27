import {PdfPageCanvas} from '@/features/documents/components/checklist/PdfPageCanvas';
import {getShortRoleLabel} from '@/features/documents/components/checklist/DocumentApprovalCell';
import {isHistoricalDocumentCode, isOcrOnlyDocumentCode} from '@/features/documents/lib/checklist/definitions';
import {formatBytes} from '@/features/documents/lib/checklist/format-bytes';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';
import {api} from '@/shared/lib/api';
import {
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  History,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import './DocumentInspectModal.css';

function formatShortDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]}, ${hh}:${mm}`;
}

export function DocumentInspectModal({
  row,
  application,
  onClose,
  onUpload,
  onDelete,
  deletingFileId,
  onRequestApproval,
  onDownloadAll,
  approvalBusy,
}: {
  row: ChecklistRow;
  application?: any;
  onClose: () => void;
  onUpload: (code: string, chkId?: string) => void;
  onDelete?: (fileId: string, code: string) => Promise<void> | void;
  deletingFileId?: string | null;
  onRequestApproval?: (row: ChecklistRow) => Promise<void> | void;
  onDownloadAll?: () => void;
  approvalBusy?: string | null;
}) {
  const files: any[] = row.files || [];
  const currentFile = useMemo(
    () => files.find(f => f.isCurrent) || files[files.length - 1] || null,
    [files],
  );
  const [selectedFileId, setSelectedFileId] = useState<string | null>(() => currentFile?.id || null);
  const [showHistory, setShowHistory] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [pageNum, setPageNum] = useState(1);
  const [jumpSeq, setJumpSeq] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (files.length && (!selectedFileId || !files.some(f => f.id === selectedFileId))) {
      const cur = files.find(f => f.isCurrent) || files[files.length - 1];
      setSelectedFileId(cur?.id || null);
    }
  }, [files, selectedFileId]);

  const activeFile = useMemo(
    () => files.find(f => f.id === selectedFileId) || files[files.length - 1] || null,
    [files, selectedFileId],
  );

  useEffect(() => {
    setPageNum(1);
    setJumpSeq(0);
    setNumPages(0);
    setRotation(0);
    setZoom(100);
  }, [activeFile?.id]);

  const loadPreview = useCallback(async (fileId: string) => {
    setLoadingPreview(true);
    setPreviewError(false);
    try {
      const res = await api(`/files/${fileId}/url`);
      if (!res?.url) {
        setPreviewUrl('');
        setPreviewError(true);
        return;
      }
      const probe = await fetch(res.url, {credentials: 'same-origin'});
      if (!probe.ok) {
        setPreviewUrl('');
        setPreviewError(true);
        return;
      }
      const blob = await probe.blob();
      const objUrl = URL.createObjectURL(blob);
      setPreviewUrl(prev => {
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return objUrl;
      });
    } catch {
      setPreviewUrl('');
      setPreviewError(true);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    if (!activeFile?.id) {
      setPreviewUrl('');
      return;
    }
    loadPreview(activeFile.id);
  }, [activeFile?.id, loadPreview]);

  async function handleDownloadFile(fileId: string) {
    try {
      const res = await api(`/files/${fileId}/url?download=1`);
      if (res?.url) {
        const a = document.createElement('a');
        a.href = res.url;
        a.download = '';
        a.click();
      }
    } catch {
      // ignore
    }
  }

  const approval = row.check?.approval;
  const steps: any[] = approval?.steps || [];
  const totalSteps = steps.length;
  const approvedSteps = steps.filter((s: any) => s.status === 'APPROVED').length;
  const isRejected = !approval?.reopened && (approval?.state === 'REJECTED' || steps.some((s: any) => s.status === 'REJECTED' && !s.reopened));
  const isApproved = !isRejected && !approval?.reopened && (approval?.state === 'APPROVED' || (totalSteps > 0 && approvedSteps === totalSteps));
  const isInReview = !isApproved && !isRejected && approval?.state === 'IN_APPROVAL';
  const isOcrOnly = isOcrOnlyDocumentCode(row.code);
  const isHistoricalDoc = isHistoricalDocumentCode(row.code);
  const visibleFiles = useMemo(() => {
    if (isHistoricalDoc && !showHistory && currentFile) return [currentFile];
    return files;
  }, [isHistoricalDoc, showHistory, currentFile, files]);
  const canSubmit = !!onRequestApproval && !!approval?.canRequest && !isInReview;
  const canReplace = !isInReview && !isOcrOnly;
  const isSubmitting = approvalBusy === row.chkId;

  const statusText = isApproved
    ? 'Approved'
    : isInReview
      ? 'In review'
      : isRejected
        ? 'Needs changes'
        : 'Ready to submit';
  const statusPillClass = isApproved
    ? 'is-approved'
    : isInReview
      ? 'is-in-review'
      : isRejected
        ? 'is-rejected'
        : '';

  // Group steps into tiers by order/sortOrder so vertical rail connects consecutive tiers
  const tiers = useMemo(() => {
    const map = new Map<number, any[]>();
    steps.forEach((s: any, idx: number) => {
      const ord = Number(s.order ?? s.sortOrder ?? idx + 1);
      const arr = map.get(ord) || [];
      arr.push({...s, _idx: idx});
      map.set(ord, arr);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([order, items]) => ({order, items}));
  }, [steps]);

  const companyName = application?.customer?.companyName || application?.companyName || '';
  const appNumber = application?.applicationNumber || application?.application_number || '';
  const isPdf =
    activeFile?.mimeType === 'application/pdf' ||
    String(activeFile?.fileName || '').toLowerCase().endsWith('.pdf');

  return (
    <div className="doc-inspect-scrim" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="doc-inspect-modal" role="dialog" aria-modal="true" aria-label={row.name}>
        {/* Header */}
        <div className="doc-inspect-head">
          <div>
            <div className="doc-inspect-title-row">
              <h2 className="doc-inspect-title">{row.name}</h2>
              <span className={`doc-inspect-pill ${statusPillClass}`}>• {statusText}</span>
            </div>
            <p className="doc-inspect-sub">
              {companyName}
              {appNumber ? ` · ${appNumber}` : ''}
              {activeFile?.createdAt ? ` · uploaded ${formatShortDate(activeFile.createdAt)}` : ''}
            </p>
          </div>
          <div className="doc-inspect-head-actions">
            {onDownloadAll && files.length > 0 && (
              <button type="button" className="doc-inspect-btn" onClick={onDownloadAll}>
                <Download size={14} />
                <span>Download all</span>
              </button>
            )}
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 3-Pane Body */}
        <div className="doc-inspect-body">
          {/* Left: Files */}
          <div className="doc-inspect-files-pane">
            <div className="doc-inspect-files-head">
              <div className="doc-inspect-section-label">FILES ({visibleFiles.length})</div>
              {isHistoricalDoc && files.length > 0 && (
                <button
                  type="button"
                  className={`doc-inspect-history-btn ${showHistory ? 'is-active' : ''}`}
                  onClick={() => setShowHistory(h => !h)}
                  title={showHistory ? 'Show latest file only' : `Show all ${files.length} historical files`}
                >
                  <History size={12} />
                  <span>{showHistory ? 'Latest' : `History (${files.length})`}</span>
                </button>
              )}
            </div>
            {visibleFiles.map((f: any) => {
              const fPdf = f.mimeType === 'application/pdf' || String(f.fileName || '').toLowerCase().endsWith('.pdf');
              const active = activeFile?.id === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`doc-inspect-file-item ${active ? 'is-active' : ''}`}
                  onClick={() => setSelectedFileId(f.id)}
                >
                  <span className={`doc-inspect-file-badge ${fPdf ? '' : 'is-img'}`}>
                    {fPdf ? 'PDF' : 'IMG'}
                  </span>
                  <div style={{minWidth: 0, flex: 1}}>
                    <div className="doc-inspect-file-name">{f.fileName}</div>
                    <div className="doc-inspect-file-size">{formatBytes(f.fileSize)}</div>
                  </div>
                </button>
              );
            })}
            {canReplace ? (
              <button
                type="button"
                className="doc-inspect-add-btn"
                onClick={() => onUpload(row.code, row.chkId)}
              >
                <Plus size={14} />
                <span>Add file</span>
              </button>
            ) : isOcrOnly ? (
              <div className="doc-inspect-ocr-note">
                Upload &amp; replace via OCR section
              </div>
            ) : null}
          </div>

          {/* Center: Preview */}
          <div className="doc-inspect-preview-pane">
            <div className="doc-inspect-preview-toolbar">
              <div style={{display: 'flex', alignItems: 'center', gap: 10, minWidth: 0}}>
                <span style={{fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                  {activeFile?.fileName || 'No file'}
                </span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                <div className="doc-inspect-zoom-group">
                  <button
                    type="button"
                    className="doc-inspect-pager-btn"
                    onClick={() => setZoom(z => Math.max(50, z - 25))}
                    title="Zoom out"
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{fontSize: 12, fontWeight: 600, minWidth: 42, textAlign: 'center', color: '#0f172a'}}>
                    {zoom}%
                  </span>
                  <button
                    type="button"
                    className="doc-inspect-pager-btn"
                    onClick={() => setZoom(z => Math.min(200, z + 25))}
                    title="Zoom in"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                {activeFile && (
                  <button
                    type="button"
                    className="doc-inspect-btn"
                    style={{padding: '5px 8px'}}
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    title="Rotate 90°"
                  >
                    <RotateCw size={13} />
                  </button>
                )}
                {activeFile && (
                  <button
                    type="button"
                    className="doc-inspect-btn"
                    style={{padding: '5px 8px'}}
                    onClick={() => loadPreview(activeFile.id)}
                    title="Reload preview"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="doc-inspect-preview-canvas">
              {loadingPreview ? (
                <div style={{color: '#64748b', fontSize: 13}}>Loading preview...</div>
              ) : previewUrl && !previewError ? (
                isPdf ? (
                  <PdfPageCanvas
                    url={previewUrl}
                    pageNum={pageNum}
                    jumpSeq={jumpSeq}
                    zoom={zoom}
                    rotation={rotation}
                    onNumPages={setNumPages}
                    onVisiblePageChange={setPageNum}
                    onError={() => setPreviewError(true)}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={activeFile?.fileName || 'Document preview'}
                    className="doc-inspect-preview-img"
                    style={{width: `${zoom}%`, transform: rotation ? `rotate(${rotation}deg)` : undefined}}
                  />
                )
              ) : (
                <div style={{textAlign: 'center', color: '#64748b', fontSize: 13}}>
                  <FileText size={28} style={{margin: '0 auto 8px', color: '#94a3b8'}} />
                  <div>Unable to preview this file.</div>
                  {activeFile && (
                    <button
                      type="button"
                      className="doc-inspect-btn"
                      style={{marginTop: 10}}
                      onClick={() => handleDownloadFile(activeFile.id)}
                    >
                      <Download size={13} />
                      <span>Download file</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: File Meta & Approver Stepper + Footer */}
          <div className="doc-inspect-right-pane">
            <div className="doc-inspect-right-scroll">
              {activeFile && (
                <div className="doc-inspect-meta-block">
                  <div className="doc-inspect-section-label">THIS FILE</div>
                  <div className="doc-inspect-meta-title">{activeFile.fileName}</div>
                  <div className="doc-inspect-meta-sub">
                    {isPdf ? 'PDF document' : 'Image'} · {formatBytes(activeFile.fileSize)}
                  </div>
                  {(activeFile.uploadedBy || activeFile.createdAt) && (
                    <div className="doc-inspect-meta-sub">
                      Uploaded{activeFile.uploadedBy ? ` by ${activeFile.uploadedBy}` : ''}
                      {activeFile.createdAt ? ` · ${formatShortDate(activeFile.createdAt)}` : ''}
                    </div>
                  )}
                  <div className="doc-inspect-file-actions">
                    <button
                      type="button"
                      className="doc-inspect-dl-link"
                      onClick={() => handleDownloadFile(activeFile.id)}
                    >
                      Download this file
                    </button>
                    {onDelete && !isInReview && (
                      <button
                        type="button"
                        className="doc-inspect-remove-link"
                        disabled={deletingFileId === activeFile.id}
                        onClick={() => onDelete(activeFile.id, row.code)}
                      >
                        <Trash2 size={12} />
                        <span>{deletingFileId === activeFile.id ? 'Removing...' : 'Remove'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="doc-inspect-section-label" style={{marginBottom: 10}}>
                  APPROVAL (WHOLE DOCUMENT)
                </div>
                {tiers.length > 0 ? (
                  <div className="doc-inspect-stepper">
                    {tiers.map((tier, tIdx) => {
                      const allTierApproved = tier.items.every((s: any) => s.status === 'APPROVED');
                      const anyTierRejected = tier.items.some((s: any) => s.status === 'REJECTED' && !s.reopened);
                      const anyTierPending = tier.items.some((s: any) => s.status === 'PENDING');
                      const tierClass = allTierApproved
                        ? 'is-approved'
                        : anyTierRejected
                          ? 'is-rejected'
                          : anyTierPending
                            ? 'is-pending'
                            : '';

                      const rolesLabel = tier.items
                        .map((s: any) => s.roleLabel || s.name || getShortRoleLabel(s, s._idx))
                        .join(' + ');

                      const decidedStep = tier.items.find((s: any) => s.decidedBy || s.decidedAt);
                      const subDesc = allTierApproved
                        ? `Approved${decidedStep?.decidedBy ? ` by ${decidedStep.decidedBy}` : ''}${decidedStep?.decidedAt ? ` · ${formatShortDate(decidedStep.decidedAt)}` : ''}`
                        : anyTierRejected
                          ? `Rejected${decidedStep?.decidedBy ? ` by ${decidedStep.decidedBy}` : ''}`
                          : anyTierPending
                            ? 'Waiting for approval'
                            : 'Not submitted yet';

                      return (
                        <div key={tier.order} className={`doc-inspect-step ${tierClass}`}>
                          <div className="doc-inspect-step-rail">
                            <span className="doc-inspect-step-node">
                              {allTierApproved ? (
                                <Check size={12} strokeWidth={3} />
                              ) : anyTierRejected ? (
                                <X size={12} strokeWidth={3} />
                              ) : anyTierPending ? (
                                <Clock size={12} />
                              ) : (
                                tIdx + 1
                              )}
                            </span>
                          </div>
                          <div className="doc-inspect-step-info">
                            <span className="doc-inspect-step-role">{rolesLabel}</span>
                            <span className="doc-inspect-step-desc">{subDesc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="doc-inspect-meta-sub">No approval needed for this document.</div>
                )}
              </div>
            </div>

            {/* Footer: Replace + Submit for approval (or Approved · locked) */}
            <div className="doc-inspect-right-footer">
              {canSubmit ? (
                <>
                  {canReplace && (
                    <button
                      type="button"
                      className="doc-inspect-btn"
                      disabled={isSubmitting}
                      onClick={() => onUpload(row.code, row.chkId)}
                    >
                      <RefreshCw size={13} />
                      <span>Replace</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="doc-inspect-btn doc-inspect-btn--primary"
                    disabled={isSubmitting}
                    onClick={async () => {
                      if (onRequestApproval) {
                        await onRequestApproval(row);
                        onClose();
                      }
                    }}
                  >
                    <Send size={13} />
                    <span>{isSubmitting ? 'Submitting...' : 'Submit for approval'}</span>
                  </button>
                </>
              ) : isApproved ? (
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8}}>
                  <span className="doc-inspect-locked-note">
                    <CheckSquare size={14} />
                    <span>Approved · locked</span>
                  </span>
                  {canReplace && (
                    <button
                      type="button"
                      className="doc-inspect-btn"
                      onClick={() => onUpload(row.code, row.chkId)}
                    >
                      <RefreshCw size={13} />
                      <span>Re-upload</span>
                    </button>
                  )}
                </div>
              ) : isInReview ? (
                <span className="doc-inspect-locked-note">
                  <Clock size={14} color="#d97706" />
                  <span>Waiting for approval ({approvedSteps}/{totalSteps})</span>
                </span>
              ) : (
                canReplace && (
                  <button
                    type="button"
                    className="doc-inspect-btn"
                    onClick={() => onUpload(row.code, row.chkId)}
                  >
                    <RefreshCw size={13} />
                    <span>Replace</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
