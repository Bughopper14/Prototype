/**
 * Redesign 2 / Step 1 unified view for non-FAP, non-Pre-analysis evidence stages (e.g. ICLF / Committee):
 * - When the stage is LOCKED by workflow prerequisites: shows the Step 1 Locked Card with links to prerequisite stages.
 * - When UNLOCKED: shows `{Stage} documents` (multi-file list with Preview & Download + Upload/Replace) AND
 *   `From earlier stages · read only` card with quick jump links.
 */
import {useRef, useState} from 'react';
import {
  ArrowRight,
  Check,
  CheckSquare,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Loader2,
  Lock,
  Upload,
} from 'lucide-react';
import {createPreviewState} from '@/features/applications/components/workspace/ApprovalSummary';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {screenOf} from '@/features/applications/lib/workspace/stage';
import {DocumentPreviewModal} from '@/features/documents/components/checklist/DocumentPreviewModal';
import {storedFileUrl} from '@/features/documents/lib/checklist/file-url';
import type {PreviewState} from '@/features/documents/lib/checklist/types';
import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';
import {ConfirmUploadBubble} from '@/shared/ui/ConfirmUploadBubble';

function formatUploadedAt(raw?: string) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short'});
  const time = d.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', hour12: false});
  return `${day} ${time}`;
}

function fmtSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function EvidenceRedesignView({onOpenChecklist}: {onOpenChecklist?: () => void}) {
  const {
    a,
    busy,
    canUpload,
    activeItem,
    activeFiles,
    setShowHistoryModal,
    handleFileUpload,
  } = useDocumentsStudioContext();
  const {setActiveStage} = useWorkspace();

  const [dragging, setDragging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewModal, setPreviewModal] = useState<PreviewState | null>(null);
  const emptyInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const stageProgressList: any[] = a.stageProgress || [];
  const wfStages: any[] = a.workflow?.stages || [];
  const wfGroups: any[] = a.workflow?.groups || [];
  const docs: any[] = a.documentChecks || [];

  const curStageCode = activeItem.stageCode || '';
  const curSp = stageProgressList.find((p: any) => p.stage === curStageCode);
  const isLockedStage = Boolean(curSp && !curSp.completed && !curSp.submitted && !curSp.canSubmit);

  const groupOrderMap = new Map<string, number>();
  wfGroups.forEach((g: any, idx: number) => groupOrderMap.set(g.code, g.order ?? idx + 1));
  const curWf = wfStages.find((w: any) => w.code === curStageCode);
  const curGroupCode = curWf?.groupCode || curSp?.groupCode || '';
  const curGroupOrder = groupOrderMap.get(curGroupCode) ?? 99;
  const curOrder = curWf?.order ?? 99;

  const earlierStages = wfStages.filter((other: any) => {
    if (other.code === curStageCode) return false;
    const oGroupOrder = groupOrderMap.get(other.groupCode) ?? 0;
    if (other.groupCode && curGroupCode && other.groupCode === curGroupCode) {
      return (other.order ?? 0) < curOrder;
    }
    return oGroupOrder < curGroupOrder;
  });

  const incompletePrereqs = earlierStages.filter((st: any) => {
    const sp = stageProgressList.find((p: any) => p.stage === st.code);
    return !sp?.completed;
  });

  const stageTitle = activeItem.title || activeItem.name || activeItem.stage || 'Stage document';
  const stageName = activeItem.stage || curWf?.name || 'Stage';

  // LOCKED STATE (Step 1 SVG)
  if (isLockedStage) {
    const prereqNames =
      incompletePrereqs.length > 1
        ? `${incompletePrereqs.slice(0, -1).map((p: any) => p.name).join(', ')} and ${incompletePrereqs[incompletePrereqs.length - 1].name}`
        : incompletePrereqs[0]?.name || 'previous stages';

    return (
      <div className="r1-wrap">
        <div className="r1-card" style={{padding: '44px 24px', textAlign: 'center'}}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#f1f5f9',
              color: '#475569',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Lock size={20} />
          </div>
          <h3 style={{margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a'}}>
            {stageName} opens after {prereqNames} {incompletePrereqs.length > 1 ? 'are' : 'is'} approved
          </h3>
          <p style={{margin: '6px 0 22px', fontSize: 13, color: '#64748b'}}>
            {curSp?.blockedReason || `Documents for ${stageName} can be uploaded once the earlier stages are approved.`}
          </p>

          {incompletePrereqs.length > 0 && (
            <div style={{maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left'}}>
              {incompletePrereqs.map((pr: any) => {
                const prSp = stageProgressList.find((p: any) => p.stage === pr.code);
                const prDocs = docs.filter(d => d.stageCode === pr.code);
                const prUploaded = prDocs.filter(d => (d.files || []).length > 0).length;
                const prStatus = prSp?.submitted ? 'In review' : prUploaded > 0 ? 'In progress' : 'Not submitted';
                return (
                  <div key={pr.code} className="r1-submit-row">
                    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                      <Clock size={16} color={prSp?.submitted ? '#2563eb' : '#d97706'} />
                      <div>
                        <div style={{fontSize: 13.5, fontWeight: 700, color: '#0f172a'}}>
                          {pr.name}{' '}
                          <span style={{fontSize: 12, fontWeight: 600, color: prSp?.submitted ? '#1d4ed8' : '#b45309', marginLeft: 4}}>
                            {prStatus}
                          </span>
                        </div>
                        <div style={{fontSize: 12, color: '#64748b', marginTop: 2}}>
                          {prUploaded} of {prDocs.length} document{prDocs.length === 1 ? '' : 's'} uploaded
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="r1-link-btn"
                      onClick={() => setActiveStage(screenOf(pr))}
                    >
                      Open {pr.name} <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const isApproved =
    activeItem.chk?.approvalStatus === 'APPROVED' || activeItem.chk?.approval?.state === 'APPROVED';
  const isInApproval =
    activeItem.chk?.approvalStatus === 'IN_APPROVAL' || activeItem.chk?.approval?.state === 'IN_APPROVAL';

  const onSelectFile = (f?: File | null) => {
    if (!f || busy || !canUpload) return;
    if (isApproved) {
      setPendingFile(f);
      setConfirmOpen(true);
    } else {
      handleFileUpload(activeItem, f);
    }
  };

  const stageDocs = docs.filter(d => d.stageCode === curStageCode);
  const allStageFiles = stageDocs.flatMap(d => (d.files || []).map((f: any) => ({doc: d, file: f})));

  return (
    <div className="r1-wrap">
      {/* Main Stage Documents Card (matches Step 1 SVG 06_documents_iclf.png) */}
      <section className="r1-card r1-card-pad">
        <div className="r1-submit-head" style={{marginBottom: 16}}>
          <div>
            <h2>{stageName} documents</h2>
            <p>Files of this stage. Earlier stages are listed below, read only.</p>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            {activeFiles.length > 0 && (
              <button type="button" className="r1-btn-outline sm" onClick={() => setShowHistoryModal(true)}>
                <CheckSquare size={14} />
                <span>History ({activeFiles.length})</span>
              </button>
            )}
            {canUpload && (
              <>
                <button
                  type="button"
                  className="r1-btn-navy sm"
                  disabled={busy}
                  onClick={() => (activeFiles.length > 0 ? replaceInputRef.current?.click() : emptyInputRef.current?.click())}
                >
                  {busy ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                  <span>{activeFiles.length > 0 ? 'Upload file' : 'Browse file'}</span>
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
        </div>

        {activeFiles.length === 0 && allStageFiles.length === 0 ? (
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
        ) : (
          <div style={{border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden'}}>
            {/* Document group header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 16px',
                background: '#ffffff',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <div className="fap-r2-file-icon">
                  <FileText size={18} />
                </div>
                <div>
                  <div style={{fontSize: 14, fontWeight: 700, color: '#0f172a'}}>{stageTitle}</div>
                  <div style={{fontSize: 12, color: '#64748b', marginTop: 2}}>
                    {activeItem.desc || `Required document for ${stageName}`}
                  </div>
                </div>
              </div>
              <div style={{textAlign: 'right'}}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isApproved ? '#15803d' : isInApproval ? '#d97706' : '#1d4ed8',
                  }}
                >
                  {isApproved ? 'Approved' : isInApproval ? 'In review' : 'Uploaded'}
                </div>
                <div style={{fontSize: 11.5, color: '#64748b', marginTop: 2}}>
                  {activeFiles.length} {activeFiles.length === 1 ? 'file' : 'files'}
                </div>
              </div>
            </div>

            {/* Individual uploaded files */}
            {activeFiles.map((f: any, idx: number) => {
              const isPdf = (f.mimeType || '').includes('pdf') || String(f.fileName || '').toLowerCase().endsWith('.pdf');
              const url = storedFileUrl(f) || (f.fileName ? `/documents/${encodeURIComponent(f.fileName)}` : '');
              const ps = createPreviewState(activeItem.chk || {documentName: stageTitle, files: activeFiles}, f);
              const meta = [
                fmtSize(f.fileSize),
                f.uploadedByName || f.uploadedBy || f.createdBy,
                formatUploadedAt(f.uploadedAt || f.createdAt),
              ]
                .filter(Boolean)
                .join(', ');

              return (
                <div
                  key={f.id || f.fileName || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '11px 16px',
                    borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                    background: '#ffffff',
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center', gap: 10, minWidth: 0}}>
                    <span className={`r1-file-badge ${isPdf ? 'pdf' : 'img'}`}>{isPdf ? 'PDF' : 'IMG'}</span>
                    <span style={{fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                      {f.fileName || 'Uploaded file'}
                    </span>
                    {meta && <span style={{fontSize: 12, color: '#64748b', whiteSpace: 'nowrap'}}>{meta}</span>}
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0}}>
                    {ps && (
                      <button type="button" className="r1-link-btn" onClick={() => setPreviewModal(ps)}>
                        Preview
                      </button>
                    )}
                    {url && (
                      <a
                        href={url}
                        download={f.fileName || 'document'}
                        className="r1-link-btn"
                        style={{textDecoration: 'none'}}
                      >
                        <Download size={13} /> Download
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {onOpenChecklist && (
          <div style={{marginTop: 14, display: 'flex', justifyContent: 'flex-end'}}>
            <button type="button" className="r1-link-btn" onClick={onOpenChecklist}>
              Open Document Checklist <ArrowRight size={13} />
            </button>
          </div>
        )}
      </section>

      {/* From earlier stages · read only (matches Step 1 SVG 06_documents_iclf.png) */}
      {earlierStages.length > 0 && (
        <section className="r1-card r1-card-pad">
          <div style={{display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12}}>
            <h3 style={{margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a'}}>From earlier stages</h3>
            <span style={{fontSize: 12, color: '#64748b'}}>read only</span>
          </div>
          <div className="r1-submit-rows">
            {earlierStages.map((st: any) => {
              const stSp = stageProgressList.find((p: any) => p.stage === st.code);
              const stDocs = docs.filter(d => d.stageCode === st.code);
              const stFiles = stDocs.reduce((acc, d) => acc + (d.files?.length || 0), 0);
              return (
                <div key={st.code} className="r1-submit-row">
                  <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                    {stSp?.completed ? (
                      <span className="r1-status-icon approved" style={{width: 20, height: 20, marginTop: 0}}>
                        <Check size={11} strokeWidth={3} />
                      </span>
                    ) : (
                      <Clock size={16} color="#d97706" />
                    )}
                    <span style={{fontWeight: 700, color: '#0f172a'}}>{st.name}</span>
                    <span style={{fontSize: 12, fontWeight: 600, color: stSp?.completed ? '#15803d' : '#64748b'}}>
                      {stSp?.completed ? 'Approved' : stSp?.submitted ? 'In review' : 'In progress'}
                    </span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                    <span style={{fontSize: 12, color: '#64748b'}}>
                      {stDocs.length} {stDocs.length === 1 ? 'document' : 'documents'}, {stFiles} {stFiles === 1 ? 'file' : 'files'}
                    </span>
                    <button
                      type="button"
                      className="r1-link-btn"
                      onClick={() => setActiveStage(screenOf(st))}
                    >
                      Open <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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

      {previewModal && <DocumentPreviewModal preview={previewModal} onClose={() => setPreviewModal(null)} />}
    </div>
  );
}
