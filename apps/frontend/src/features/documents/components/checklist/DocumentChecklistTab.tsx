/** Document Checklist tab: stage-separated checklist (FAP / Pre-analysis / ICLF) with upload, view, and approval progress. */
import {ChecklistTable} from '@/features/documents/components/checklist/ChecklistTable';
import {DocumentPreviewModal} from '@/features/documents/components/checklist/DocumentPreviewModal';
import {useDocumentChecklist} from '@/features/documents/hooks/useDocumentChecklist';
import {ChecklistCustomizeDialog} from '@/features/documents/components/checklist/ChecklistCustomizeDialog';
import {screenOf} from '@/features/applications/lib/workspace/stage';
import {hasAuthority} from '@/shared/lib/auth';
import {ChevronRight, Clock, Download, Loader2, Lock, Settings2} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';

export interface DocumentChecklistTabProps {
  application: any;
  draft: any;
  user: any;
  onChange: (updatedApp: any) => void;
  notify: (msg: string) => void;
  activeScreen?: string;
}

const STAGE_STATUS_META: Record<string, {label: string; color: string}> = {
  APPROVED: {label: 'Approved', color: '#16a34a'},
  WAITING_APPROVAL: {label: 'Waiting for approval', color: '#d97706'},
  NEEDS_CHANGES: {label: 'Needs changes', color: '#dc2626'},
  IN_PROGRESS: {label: 'In progress', color: '#2563eb'},
  NOT_STARTED: {label: 'Not started', color: '#64748b'},
};

export function DocumentChecklistTab({application, draft, user, onChange, notify, activeScreen}: DocumentChecklistTabProps) {
  const c = useDocumentChecklist({application, draft, user, onChange, notify});
  const [customizing, setCustomizing] = useState(false);
  const canCustomize = !draft?.isNew && !!application?.id && hasAuthority(user, 'CRM_DOCUMENT_UPLOAD');

  const appStages: any[] = application?.workflow?.stages || application?.stages || [];

  const matchedScreenStage = useMemo(() => {
    if (!activeScreen) return null;
    return appStages.find((s: any) => screenOf(s) === activeScreen) || null;
  }, [activeScreen, appStages]);

  const defaultStageCode = useMemo(() => {
    if (matchedScreenStage) return matchedScreenStage.code;
    const stageSource = appStages.length > 0 ? appStages : c.stages;
    const inProg = appStages.find((s: any) => s.status === 'IN_PROGRESS' || s.status === 'NEEDS_CHANGES');
    if (inProg) return inProg.code;
    return stageSource[0]?.code || '';
  }, [matchedScreenStage, appStages, c.stages]);

  const [activeStageCode, setActiveStageCode] = useState<string>(defaultStageCode);

  useEffect(() => {
    if (matchedScreenStage?.code) {
      setActiveStageCode(matchedScreenStage.code);
    }
  }, [matchedScreenStage?.code]);

  useEffect(() => {
    const validCodes = (appStages.length > 0 ? appStages : c.stages).map((s: any) => s.code);
    if (validCodes.length > 0 && !validCodes.includes(activeStageCode)) {
      setActiveStageCode(defaultStageCode);
    }
  }, [appStages, c.stages, activeStageCode, defaultStageCode]);

  const stageProgressList: any[] = application?.stageProgress || [];
  const workflowGroups: any[] = application?.workflow?.groups || [];

  const stageTabs = useMemo(() => {
    const groupOrderMap = new Map<string, number>();
    workflowGroups.forEach((g: any, idx: number) => {
      groupOrderMap.set(g.code, g.order ?? idx + 1);
    });

    const baseStages =
      appStages.length > 0
        ? appStages.map((s: any, idx: number) => ({
            code: s.code,
            name: s.name || s.code,
            status: s.status || 'NOT_STARTED',
            groupCode: s.groupCode || '',
            groupOrder: groupOrderMap.get(s.groupCode) ?? idx + 1,
            order: s.order ?? idx + 1,
          }))
        : c.stages.map((s, idx) => ({
            code: s.code,
            name: s.name,
            status: 'NOT_STARTED',
            groupCode: '',
            groupOrder: idx + 1,
            order: idx + 1,
          }));

    return baseStages.map(st => {
      const rows = c.checklistRows.filter(r => r.stage === st.code);
      const uploadedCount = rows.filter(r => r.isAvailable && r.files.length > 0).length;
      const sp = stageProgressList.find((p: any) => p.stage === st.code);
      const isLocked = !!sp && !sp.completed && !sp.submitted && !sp.canSubmit;
      const prereqs = isLocked
        ? baseStages.filter(other => {
            if (other.code === st.code) return false;
            const otherSp = stageProgressList.find((p: any) => p.stage === other.code);
            if (otherSp?.completed) return false;
            if (other.groupCode && st.groupCode && other.groupCode === st.groupCode) {
              return other.order < st.order;
            }
            return other.groupOrder < st.groupOrder;
          })
        : [];
      return {
        code: st.code,
        name: st.name,
        total: rows.length,
        uploaded: uploadedCount,
        status: st.status,
        isLocked,
        blockedReason: sp?.blockedReason || null,
        prereqCodes: prereqs.map(p => p.code),
      };
    });
  }, [appStages, c.stages, c.checklistRows, stageProgressList, workflowGroups]);

  const activeStageTab = stageTabs.find(t => t.code === activeStageCode) || stageTabs[0] || null;

  const stageRows = useMemo(
    () => c.checklistRows.filter(r => !activeStageCode || r.stage === activeStageCode),
    [c.checklistRows, activeStageCode],
  );

  const stageSummary = useMemo(() => {
    const required = stageRows.filter(r => r.isMandatory).length;
    const isMissing = (r: any) => !r.isAvailable || r.files.length === 0;
    const isApproved = (r: any) => !isMissing(r) && (r.check?.approvalStatus === 'APPROVED' || r.check?.approval?.state === 'APPROVED');
    const isInReview = (r: any) => !isMissing(r) && !isApproved(r) && r.check?.approval?.state === 'IN_APPROVAL';
    const isReadyToSubmit = (r: any) => !isMissing(r) && !isApproved(r) && !isInReview(r);

    const approved = stageRows.filter(isApproved).length;
    const inReview = stageRows.filter(isInReview).length;
    const readyToSubmit = stageRows.filter(isReadyToSubmit).length;
    const missing = stageRows.filter(isMissing).length;
    const progressPct = stageRows.length > 0 ? Math.round((approved / stageRows.length) * 100) : 0;

    return {
      total: stageRows.length,
      required,
      approved,
      inReview,
      readyToSubmit,
      missing,
      progressPct,
      isApproved,
      isInReview,
      isReadyToSubmit,
      isMissing,
    };
  }, [stageRows]);

  const displayedStageRows = useMemo(() => {
    if (c.quickFilter === 'APPROVED') return stageRows.filter(stageSummary.isApproved);
    if (c.quickFilter === 'IN_REVIEW') return stageRows.filter(stageSummary.isInReview);
    if (c.quickFilter === 'ACTION_REQUIRED') return stageRows.filter(stageSummary.isReadyToSubmit);
    if (c.quickFilter === 'MISSING') return stageRows.filter(stageSummary.isMissing);
    return stageRows;
  }, [stageRows, c.quickFilter, stageSummary]);

  const otherStageNames = stageTabs
    .filter(t => t.code !== activeStageCode)
    .map(t => t.name);

  const otherStagesLabel =
    otherStageNames.length > 1
      ? `${otherStageNames.slice(0, -1).join(', ')} and ${otherStageNames[otherStageNames.length - 1]}`
      : otherStageNames[0] || '';

  const stageStatusMeta = STAGE_STATUS_META[activeStageTab?.status || 'NOT_STARTED'] || STAGE_STATUS_META.NOT_STARTED;

  const toggleQuickFilter = (key: 'ALL' | 'ACTION_REQUIRED' | 'IN_REVIEW' | 'APPROVED' | 'MISSING') => {
    c.setQuickFilter(c.quickFilter === key ? 'ALL' : key);
  };

  return (
    <div className="doc-checklist-container">
      {/* Hidden file input for uploads */}
      <input
        type="file"
        multiple
        ref={c.fileInputRef}
        style={{display: 'none'}}
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={c.handleFileSelected}
      />

      <section className="panel doc-checklist-panel doc-stage-panel">
        {/* Stage Tabs */}
        <div className="doc-stage-tabs-bar">
          <div className="doc-stage-tabs-list">
            {stageTabs.map(st => {
              const isActive = st.code === activeStageCode;
              return (
                <button
                  key={st.code}
                  type="button"
                  className={`doc-stage-tab-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    setActiveStageCode(st.code);
                    c.setQuickFilter('ALL');
                  }}
                >
                  <span>{st.name}</span>
                  {st.isLocked ? (
                    <span className="doc-stage-tab-locked">locked</span>
                  ) : (
                    <span className="doc-stage-tab-count">
                      {st.uploaded}/{st.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeStageTab?.isLocked ? (
          (() => {
            const prereqTabs = stageTabs.filter(t => activeStageTab.prereqCodes.includes(t.code));
            const prereqNames =
              prereqTabs.length > 1
                ? `${prereqTabs.slice(0, -1).map(p => p.name).join(', ')} and ${prereqTabs[prereqTabs.length - 1].name}`
                : prereqTabs[0]?.name || 'previous stage';
            const docNames = stageRows.map(r => r.name).join(', ');
            return (
              <div className="doc-locked-state">
                <div className="doc-locked-icon">
                  <Lock size={20} />
                </div>
                <h3 className="doc-locked-title">
                  {activeStageTab.name} opens after {prereqNames} {prereqTabs.length > 1 ? 'are' : 'is'} approved
                </h3>
                <p className="doc-locked-subtitle">
                  {activeStageTab.blockedReason
                    ? `${activeStageTab.blockedReason} Documents for this stage can be uploaded as soon as the prerequisite stage${prereqTabs.length > 1 ? 's are' : ' is'} approved.`
                    : `Documents for this stage can be uploaded as soon as the prerequisite stage${prereqTabs.length > 1 ? 's are' : ' is'} approved.`}
                </p>

                {prereqTabs.length > 0 && (
                  <div className="doc-locked-prereqs">
                    {prereqTabs.map(pr => {
                      const prSp = stageProgressList.find((p: any) => p.stage === pr.code);
                      const prState = prSp?.submitted
                        ? 'In review'
                        : pr.uploaded > 0
                          ? 'In progress'
                          : 'Not submitted';
                      const prTone = prSp?.submitted ? 'review' : pr.uploaded > 0 ? 'progress' : 'pending';
                      return (
                        <div key={pr.code} className="doc-locked-prereq-card">
                          <div className="doc-locked-prereq-left">
                            <Clock size={16} className={`doc-locked-prereq-icon ${prTone}`} />
                            <div>
                              <div className="doc-locked-prereq-title">
                                <span>{pr.name}</span>
                                <span className={`doc-locked-prereq-badge ${prTone}`}>{prState}</span>
                              </div>
                              <div className="doc-locked-prereq-sub">
                                {pr.uploaded} of {pr.total} document{pr.total !== 1 ? 's' : ''} uploaded
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="doc-locked-open-btn"
                            onClick={() => {
                              setActiveStageCode(pr.code);
                              c.setQuickFilter('ALL');
                            }}
                          >
                            Open {pr.name} <ChevronRight size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {stageRows.length > 0 && (
                  <p className="doc-locked-footnote">
                    {activeStageTab.name} needs {stageRows.length} document{stageRows.length !== 1 ? 's' : ''}: {docNames}
                  </p>
                )}
              </div>
            );
          })()
        ) : (
          <>
            {/* Green/blue stage accent bar */}
            <div className="doc-stage-accent-line">
              <div
                className="doc-stage-accent-fill"
                style={{
                  width: `${Math.max(activeStageTab && activeStageTab.total > 0 ? Math.round((activeStageTab.uploaded / activeStageTab.total) * 100) : 0, 100)}%`,
                  background: activeStageTab?.status === 'APPROVED' || (activeStageTab && activeStageTab.uploaded > 0) ? '#0d9488' : '#0d9488',
                }}
              />
            </div>

            {/* Stage Summary Header */}
            <div className="doc-stage-summary-header">
          <div>
            <div className="doc-stage-title-row">
              <h2 className="doc-stage-title">{activeStageTab?.name || 'Stage'} stage</h2>
              <span className="doc-stage-status-inline" style={{color: stageStatusMeta.color}}>
                <span className="doc-stage-status-dot" style={{background: stageStatusMeta.color}} />
                {stageStatusMeta.label}
              </span>
            </div>
            <p className="doc-stage-subtitle">
              {stageSummary.total} document{stageSummary.total !== 1 ? 's' : ''} · {stageSummary.required} required
            </p>
          </div>

          <div className="doc-head-actions">
            {canCustomize && (
              <button
                type="button"
                className="button doc-customize-btn"
                onClick={() => setCustomizing(true)}
              >
                <Settings2 size={15} /> Customize checklist
              </button>
            )}
            <button
              type="button"
              className="button doc-download-all-btn"
              disabled={c.zipping || c.fileCount === 0}
              title={
                c.fileCount === 0
                  ? 'No files uploaded yet'
                  : `Download ${c.fileCount} files in a single ZIP`
              }
              onClick={c.handleDownloadAll}
            >
              {c.zipping ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
              <span>{c.zipping ? 'Preparing ZIP...' : 'Download all'}</span>
            </button>
          </div>
        </div>

        {/* Stage Progress Bar & Legend */}
        <div className="doc-stage-progress-section">
          <div className="doc-stage-progress-track">
            <div className="doc-stage-progress-fill" style={{width: `${stageSummary.progressPct}%`}} />
          </div>
          <div className="doc-stage-legend-row">
            <button
              type="button"
              className={`doc-stage-legend-item ${c.quickFilter === 'APPROVED' ? 'is-active' : ''}`}
              onClick={() => toggleQuickFilter('APPROVED')}
            >
              <span className="doc-legend-dot" style={{background: '#16a34a'}} />
              <strong>{stageSummary.approved}</strong> Approved
            </button>
            <button
              type="button"
              className={`doc-stage-legend-item ${c.quickFilter === 'IN_REVIEW' ? 'is-active' : ''}`}
              onClick={() => toggleQuickFilter('IN_REVIEW')}
            >
              <span className="doc-legend-dot" style={{background: '#d97706'}} />
              <strong>{stageSummary.inReview}</strong> In review
            </button>
            <button
              type="button"
              className={`doc-stage-legend-item ${c.quickFilter === 'ACTION_REQUIRED' ? 'is-active' : ''}`}
              onClick={() => toggleQuickFilter('ACTION_REQUIRED')}
            >
              <span className="doc-legend-dot" style={{background: '#2563eb'}} />
              <strong>{stageSummary.readyToSubmit}</strong> Ready to submit
            </button>
            <button
              type="button"
              className={`doc-stage-legend-item ${c.quickFilter === 'MISSING' ? 'is-active' : ''}`}
              onClick={() => toggleQuickFilter('MISSING')}
            >
              <span className="doc-legend-dot" style={{background: '#94a3b8'}} />
              <strong>{stageSummary.missing}</strong> Missing file
            </button>
          </div>
        </div>

        {/* Documents Table for the Active Stage ONLY */}
        <ChecklistTable
          rows={displayedStageRows}
          application={application}
          grouped={false}
          collapsedStages={c.collapsedStages}
          onToggleStage={c.toggleStage}
          uploadingCode={c.uploadingCode}
          deletingFileId={c.deletingFileId}
          onPreview={c.handleOpenPreview}
          onUpload={c.handleTriggerUpload}
          onDelete={c.handleDeleteManualFile}
          onRequestApproval={c.canRequestApproval ? c.requestApproval : undefined}
          onDownloadAll={c.handleDownloadAll}
          approvalBusy={c.approvalBusy}
        />
          </>
        )}
      </section>

      {otherStagesLabel && (
        <div className="doc-stage-footer-note">
          {otherStagesLabel} documents are in their own tabs above · stages run in parallel
        </div>
      )}

      {customizing && (
        <ChecklistCustomizeDialog application={application} onChange={onChange} notify={notify} onClose={() => setCustomizing(false)} />
      )}

      {c.previewModal && (
        <DocumentPreviewModal preview={c.previewModal} onClose={() => c.setPreviewModal(null)} />
      )}
    </div>
  );
}
