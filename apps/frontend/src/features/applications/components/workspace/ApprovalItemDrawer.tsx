/**
 * Slide-over right drawer (560px) for inspecting and acting on a Document or Deed approval item.
 * Matches Redesign 1 Figma artboard (10_approvals_deed_drawer.png).
 */
import {createPreviewState, useOpenView} from '@/features/applications/components/workspace/ApprovalSummary';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {layersOf, shownStatus, whoOf, type Scope, type Step} from '@/features/applications/components/workspace/approval-shared';
import type {PreviewState} from '@/features/documents/lib/checklist/types';
import {Check, ChevronRight, X} from 'lucide-react';

function fmtDate(v?: string | null): string {
  if (!v) return '';
  return new Date(v).toLocaleString('en-GB', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});
}

function fmtSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function fmtIdr(val: any): string {
  const num = Number(val);
  if (!val || Number.isNaN(num)) return '-';
  return `Rp ${num.toLocaleString('id-ID')}`;
}

function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
}

export function ApprovalItemDrawer({
  scope,
  onClose,
  onDecide,
  onPreview,
}: {
  scope: Scope;
  onClose: () => void;
  onDecide: (step: Step, kind: 'APPROVED' | 'REJECTED') => void;
  onPreview: (state: PreviewState) => void;
}) {
  const {a} = useWorkspace();
  const openView = useOpenView();

  const docs: any[] = a.documentChecks || [];
  const deeds: any[] = a.legal?.deeds || [];
  const stages: any[] = a.workflow?.stages || [];

  const isDoc = scope.scope === 'DOCUMENT';
  const isDeed = scope.scope === 'SECTION';

  const doc = isDoc
    ? docs.find(
        x =>
          x.id === scope.checklistId ||
          (x.documentCode && scope.documentCode && x.documentCode === scope.documentCode),
      )
    : null;

  const deed = isDeed && scope.subjectId ? deeds.find(d => d.id === scope.subjectId) : null;

  const files: any[] = doc?.files || deed?.files || [];
  const stageObj = stages.find(s => s.code === scope.stageCode);
  const stageName = stageObj?.name || scope.stageCode || 'FAP';

  const rawTitle = scope.scopeName
    .replace(/^(Document|Section|Stage|Group)\s+/i, '')
    .trim();
  const displayTitle = isDeed && deed?.deedNumber && !rawTitle.includes(deed.deedNumber)
    ? `Deed ${deed.deedNumber} · ${rawTitle}`
    : rawTitle;

  const layers = layersOf(scope.steps);
  const totalSteps = scope.steps.length;
  const approvedSteps = scope.steps.filter(s => s.status === 'APPROVED').length;
  const isAllApproved = totalSteps > 0 && approvedSteps === totalSteps;
  const isRejected = scope.steps.some(s => shownStatus(s) === 'REJECTED');
  const pendingSteps = scope.steps.filter(s => s.status === 'PENDING');
  const pendingNames = [...new Set(pendingSteps.map(whoOf))];
  const myStep = scope.steps.find(s => s.canAct);
  const canDecide = !isDoc || files.length > 0;

  const doneLayers = layers.filter(l => l.every(s => s.status === 'APPROVED'));
  const activeLayerIdx = layers.findIndex(l => l.some(s => s.status === 'PENDING'));

  const bannerTone = isAllApproved
    ? {bg: '#f0fdf4', border: '#bbf7d0', title: '#15803d', sub: '#166534', bar: '#16a34a'}
    : isRejected
      ? {bg: '#fef2f2', border: '#fecaca', title: '#dc2626', sub: '#991b1b', bar: '#dc2626'}
      : {bg: '#fffbeb', border: '#fde68a', title: '#92400e', sub: '#b45309', bar: '#16a34a'};

  const bannerHeadline = isAllApproved
    ? 'All approvals complete'
    : isRejected
      ? 'Returned for revision'
      : pendingNames.length > 0
        ? `In review · waiting on ${pendingNames.join(' & ')}`
        : 'Waiting for approval';

  const bannerSubline = isAllApproved
    ? `${approvedSteps} of ${totalSteps} approvers approved`
    : doneLayers.length > 0 && activeLayerIdx >= 0
      ? `Level ${doneLayers.length} done by ${doneLayers[doneLayers.length - 1].map(whoOf).join(' & ')} · Level ${activeLayerIdx + 1} in progress`
      : `Round ${scope.roundNo || 1} · ${layers.length} approval level${layers.length === 1 ? '' : 's'}`;

  const view = openView(scope);
  const firstFile = files[0];
  const uploadedText = firstFile?.createdAt || firstFile?.uploadedAt
    ? ` · uploaded ${fmtDate(firstFile.createdAt || firstFile.uploadedAt)}`
    : '';

  const customerSummary = [a.customer?.entityType || a.customer?.customerType, a.customer?.customerStatus || (a.customer?.isExisting ? 'Existing' : 'New')]
    .filter(Boolean)
    .join(' · ') || '-';

  return (
    <div className="r1-drawer-backdrop" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && onClose()}>
      <aside className="r1-drawer">
        {/* Header */}
        <div className="r1-drawer-head">
          <div style={{minWidth: 0}}>
            <span
              style={{
                display: 'inline-block',
                padding: '3px 8px',
                borderRadius: 6,
                background: '#f1f5f9',
                color: '#475569',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              {isDeed ? 'DEED APPROVAL' : isDoc ? 'DOCUMENT APPROVAL' : 'APPROVAL DETAIL'}
            </span>
            <h3>{displayTitle}</h3>
            <p>
              {a.customer?.companyName || 'Application'} · {stageName} stage{uploadedText}
            </p>
          </div>
          <button type="button" className="r1-icon-btn" onClick={onClose} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="r1-drawer-body">
          {/* Status Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '14px 16px',
              borderRadius: 10,
              background: bannerTone.bg,
              border: `1px solid ${bannerTone.border}`,
            }}
          >
            <div style={{minWidth: 0}}>
              <div style={{fontSize: 13.5, fontWeight: 700, color: bannerTone.title}}>{bannerHeadline}</div>
              <div style={{fontSize: 12, color: bannerTone.sub, marginTop: 2}}>{bannerSubline}</div>
            </div>
            <div style={{flexShrink: 0, textAlign: 'right', minWidth: 112}}>
              <div style={{fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6}}>
                {approvedSteps} of {totalSteps} approved
              </div>
              <div style={{width: 112, height: 6, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden'}}>
                <div
                  style={{
                    width: `${totalSteps ? Math.round((approvedSteps / totalSteps) * 100) : 0}%`,
                    height: '100%',
                    background: bannerTone.bar,
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Approval Chain */}
          <div>
            <div className="r1-eyebrow" style={{marginBottom: 12}}>
              APPROVAL CHAIN
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
              {layers.map((layer, li) => (
                <div
                  key={li}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px minmax(0, 1fr)',
                    gap: 10,
                    alignItems: 'start',
                  }}
                >
                  <span style={{fontSize: 11.5, fontWeight: 700, color: '#64748b', paddingTop: 3}}>L{li + 1}</span>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                    {layer.map(step => {
                      const st = shownStatus(step);
                      const isDone = st === 'APPROVED';
                      const isNow = st === 'PENDING';
                      const isRej = st === 'REJECTED';
                      const lastDec = step.decisions[step.decisions.length - 1];
                      const cleanNote = stripHtml(lastDec?.remarks);
                      const peerNames = layer.filter(other => other.id !== step.id).map(whoOf);

                      return (
                        <div key={step.id} style={{display: 'flex', alignItems: 'flex-start', gap: 10}}>
                          <span
                            className={`r1-v-num${isDone ? ' done' : isRej ? ' rejected' : isNow ? ' active-blue' : ''}`}
                            style={{width: 22, height: 22, marginTop: 1}}
                          >
                            {isDone ? (
                              <Check size={12} strokeWidth={3} />
                            ) : isRej ? (
                              <X size={12} strokeWidth={3} />
                            ) : isNow ? (
                              <span style={{width: 7, height: 7, borderRadius: '50%', background: '#2563eb'}} />
                            ) : null}
                          </span>
                          <div style={{flex: 1, minWidth: 0}}>
                            <div style={{fontSize: 13.5, fontWeight: 700, color: '#0f172a'}}>
                              {whoOf(step)}
                              {step.canAct ? ' (you)' : ''}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                marginTop: 2,
                                color: isDone ? '#15803d' : isRej ? '#dc2626' : isNow ? '#1d4ed8' : '#64748b',
                                fontWeight: isDone || isNow || isRej ? 500 : 400,
                              }}
                            >
                              {isDone && lastDec
                                ? `Approved by ${lastDec.by}${lastDec.decidedAt ? ` · ${fmtDate(lastDec.decidedAt)}` : ''}`
                                : isRej && lastDec
                                  ? `Returned by ${lastDec.by}${lastDec.decidedAt ? ` · ${fmtDate(lastDec.decidedAt)}` : ''}`
                                  : isNow
                                    ? step.startedAt
                                      ? `Waiting since ${fmtDate(step.startedAt)}`
                                      : peerNames.length > 0
                                        ? `Parallel with ${peerNames.join(', ')}`
                                        : 'Waiting for decision'
                                    : peerNames.length > 0 && li === activeLayerIdx
                                      ? `Parallel with ${peerNames.join(', ')}`
                                      : `Starts after level ${li}`}
                            </div>
                            {cleanNote && (
                              <div
                                style={{
                                  marginTop: 6,
                                  padding: '8px 12px',
                                  borderRadius: 8,
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  fontSize: 12.5,
                                  color: '#334155',
                                }}
                              >
                                “{cleanNote}”
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deed metadata if deed has details */}
          {isDeed && deed && (
            <div>
              <div className="r1-eyebrow" style={{marginBottom: 8}}>
                DEED DETAILS
              </div>
              <div className="r1-info-box">
                <div className="r1-info-row">
                  <span>Deed number</span>
                  <strong>{deed.deedNumber || '-'}</strong>
                </div>
                <div className="r1-info-row">
                  <span>Type</span>
                  <strong>{deed.type === 'amendment' ? 'Amendment deed' : 'Establishment deed'}</strong>
                </div>
                <div className="r1-info-row">
                  <span>Deed date</span>
                  <strong>{deed.deedDate || '-'}</strong>
                </div>
                <div className="r1-info-row">
                  <span>Notary</span>
                  <strong>{deed.notaryName || '-'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Files */}
          <div>
            <div className="r1-eyebrow" style={{marginBottom: 8}}>
              FILES ({files.length})
            </div>
            {files.length > 0 ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                {files.map((f: any, idx: number) => {
                  const isPdf = (f.mimeType || '').includes('pdf') || String(f.fileName || '').toLowerCase().endsWith('.pdf');
                  const ps = createPreviewState(doc || {documentName: displayTitle, files}, f);
                  return (
                    <div
                      key={f.id || f.fileName || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                      }}
                    >
                      <div style={{display: 'flex', alignItems: 'center', gap: 10, minWidth: 0}}>
                        <span className={`r1-file-badge ${isPdf ? 'pdf' : 'img'}`}>
                          {isPdf ? 'PDF' : 'IMG'}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {f.fileName || 'Uploaded file'}
                        </span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0}}>
                        {f.fileSize ? (
                          <span style={{fontSize: 12, color: '#64748b'}}>{fmtSize(f.fileSize)}</span>
                        ) : null}
                        {ps && (
                          <button type="button" className="r1-link-btn" onClick={() => onPreview(ps)}>
                            Preview
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{fontSize: 12.5, color: '#64748b', padding: '8px 0'}}>No files attached yet.</div>
            )}
          </div>

          {/* Application Metadata */}
          <div>
            <div className="r1-eyebrow" style={{marginBottom: 10}}>
              APPLICATION
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px'}}>
              <div>
                <div style={{fontSize: 11.5, color: '#64748b'}}>Company</div>
                <div style={{fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2}}>
                  {a.customer?.companyName || '-'}
                </div>
              </div>
              <div>
                <div style={{fontSize: 11.5, color: '#64748b'}}>FAP number</div>
                <div style={{fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2}}>
                  {a.applicationNumber || a.id}
                </div>
              </div>
              <div>
                <div style={{fontSize: 11.5, color: '#64748b'}}>Branch</div>
                <div style={{fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2}}>
                  {a.branchCode || a.branch?.code || '-'}
                </div>
              </div>
              <div>
                <div style={{fontSize: 11.5, color: '#64748b'}}>Customer</div>
                <div style={{fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2}}>{customerSummary}</div>
              </div>
              <div>
                <div style={{fontSize: 11.5, color: '#64748b'}}>Amount requested</div>
                <div style={{fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2}}>
                  {fmtIdr(a.financingAmount ?? a.amountRequested ?? a.totalFinancingAmount)}
                </div>
              </div>
              <div>
                <div style={{fontSize: 11.5, color: '#64748b'}}>PIC</div>
                <div style={{fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2}}>
                  {a.picName || a.createdByName || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="r1-drawer-foot">
          {view ? (
            <button
              type="button"
              className="r1-link-btn"
              onClick={() => {
                onClose();
                view.go();
              }}
            >
              Open application <ChevronRight size={14} />
            </button>
          ) : (
            <span />
          )}

          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            {myStep && canDecide ? (
              <>
                <button
                  type="button"
                  className="r1-btn-reject"
                  onClick={() => {
                    onClose();
                    onDecide(myStep, 'REJECTED');
                  }}
                >
                  <X size={14} strokeWidth={2.5} /> Reject
                </button>
                <button
                  type="button"
                  className="r1-btn-approve"
                  onClick={() => {
                    onClose();
                    onDecide(myStep, 'APPROVED');
                  }}
                >
                  <Check size={14} strokeWidth={2.5} /> Approve
                </button>
              </>
            ) : (
              <button type="button" className="r1-btn-outline" onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
