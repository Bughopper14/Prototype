/**
 * The APPROVER's view (tab "Approvals" — Redesign 1):
 * Stage sub-tabs + Level-by-level vertical & parallel approver cards + "Before you decide" summary box +
 * "Document & deed approvals" filtered list with step-dots chain & slide-over drawer + collapsible Approval history.
 */
import {ApprovalItemDrawer} from '@/features/applications/components/workspace/ApprovalItemDrawer';
import {createPreviewState} from '@/features/applications/components/workspace/ApprovalSummary';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {layersOf, shownStatus, whoOf, type Approval, type Scope, type Step} from '@/features/applications/components/workspace/approval-shared';
import {screenOf} from '@/features/applications/lib/workspace/stage';
import {DocumentPreviewModal} from '@/features/documents/components/checklist/DocumentPreviewModal';
import type {PreviewState} from '@/features/documents/lib/checklist/types';
import {AlertCircle, Check, ChevronRight, Clock, Lock, Paperclip, X} from 'lucide-react';
import {Fragment, useEffect, useMemo, useRef, useState} from 'react';

function fmtShortDate(v?: string | null): string {
  if (!v) return '';
  return new Date(v).toLocaleString('en-GB', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});
}

function fmtSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
}

function shortRole(name: string): string {
  const n = name.trim();
  if (/business\s*support/i.test(n) || /\bBS\b/.test(n)) return 'BS';
  if (/credit\s*analyst/i.test(n) || /\bCA\b/.test(n)) return 'CA';
  if (/management/i.test(n) || /\bMGMT\b/i.test(n)) return 'Mgmt';
  if (/legal/i.test(n)) return 'Legal';
  if (/pic\s*marketing/i.test(n)) return 'PIC MKT';
  if (/branch\s*manager/i.test(n)) return 'BM';
  if (/director/i.test(n)) return 'Dir';
  return n.length > 10 ? n.slice(0, 9) + '…' : n;
}

type HistoryEvent = {
  id: string;
  tone: 'blue' | 'green' | 'amber' | 'red';
  title: string;
  note?: string;
  timeText: string;
  sortTime: number;
};

export function ApproverView() {
  const {a, draft, activeStage, setDecision, setComments, setError} = useWorkspace();
  const [previewModal, setPreviewModal] = useState<PreviewState | null>(null);
  const [drawerScope, setDrawerScope] = useState<Scope | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'waiting' | 'approved'>('all');
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement | null>(null);

  const stages: any[] = useMemo(() => a.stageProgress || [], [a.stageProgress]);
  const wfStages: any[] = useMemo(() => a.workflow?.stages || [], [a.workflow?.stages]);

  const defaultStageCode = useMemo(() => {
    const byScreen = stages.find(st => {
      const wf = wfStages.find(w => w.code === st.stage);
      return wf && screenOf(wf) === activeStage;
    });
    return byScreen?.stage || stages[0]?.stage || '';
  }, [stages, wfStages, activeStage]);

  const [selectedStageCode, setSelectedStageCode] = useState<string>(defaultStageCode);
  useEffect(() => {
    if (defaultStageCode) setSelectedStageCode(defaultStageCode);
  }, [defaultStageCode]);

  if (draft.isNew || !a.approval) {
    return (
      <section className="r1-wrap">
        <div className="r1-card r1-card-pad" style={{color: '#64748b', fontSize: 13.5}}>
          Nothing to approve yet.
        </div>
      </section>
    );
  }

  const ap = a.approval as Approval;
  const docs: any[] = a.documentChecks || [];
  const deeds: any[] = a.legal?.deeds || [];

  const decide = (step: Step, kind: 'APPROVED' | 'REJECTED') => {
    setComments('');
    setError('');
    setDecision({stepId: step.id, step: step.name, kind});
  };

  // Determine stage pill status for each stage sub-tab
  const stageTabInfo = stages.map(st => {
    const stRound = ap.current.find(c => c.scope === 'STAGE' && c.stageCode === st.stage);
    const hasRej = stRound?.steps.some(s => shownStatus(s) === 'REJECTED');
    const allDone = st.completed || (stRound && stRound.steps.length > 0 && stRound.steps.every(s => s.status === 'APPROVED'));
    const waiting = !allDone && (st.submitted || Boolean(stRound && stRound.steps.some(s => s.status === 'PENDING')));
    const pillTone = hasRej ? 'rejected' : allDone ? 'approved' : waiting ? 'waiting' : '';
    const pillText = hasRej ? 'returned' : allDone ? 'approved' : waiting ? 'waiting' : '—';
    return {stage: st.stage as string, name: st.name as string, st, stRound, pillTone, pillText};
  });

  const activeTab = stageTabInfo.find(t => t.stage === selectedStageCode) || stageTabInfo[0];
  const stageRound = activeTab?.stRound || null;

  // Group approvals relevant to the selected stage's group (in case user needs to act on group approval)
  const groupRound = ap.current.find(
    c =>
      c.scope === 'GROUP' &&
      (c.groupCode === activeTab?.st?.groupCode ||
        (a.workflow?.groups || []).some((g: any) => g.code === c.groupCode && (g.stageCodes || []).includes(activeTab?.stage))),
  );

  // Use stageRound as hero; if stageRound is done and groupRound has pending action for this user, surface groupRound below
  const heroRound = stageRound;
  const heroLayers = heroRound ? layersOf(heroRound.steps) : [];
  const myHeroStep = heroRound?.steps.find(s => s.canAct) || null;
  const myGroupStep = groupRound?.steps.find(s => s.canAct) || null;

  const heroAllApproved = Boolean(heroRound && heroRound.steps.length > 0 && heroRound.steps.every(s => s.status === 'APPROVED'));
  const heroHasRejected = Boolean(heroRound && heroRound.steps.some(s => shownStatus(s) === 'REJECTED'));
  const heroPendingSteps = heroRound ? heroRound.steps.filter(s => s.status === 'PENDING') : [];
  const heroPendingWho = [...new Set(heroPendingSteps.map(whoOf))];

  // Latest approval timestamp for subtitle
  const allHeroDecisions = heroRound ? heroRound.steps.flatMap(s => s.decisions) : [];
  const lastApprovedDec = [...allHeroDecisions].filter(d => d.decision === 'APPROVED').pop();
  const stageName = activeTab?.name || 'FAP';
  const roundNo = heroRound?.roundNo || 1;

  const stageLabelUp = /\bstage\b/i.test(stageName) ? stageName.toUpperCase() : `${stageName.toUpperCase()} STAGE`;
  const stageLabelTitle = /\bstage\b/i.test(stageName) ? stageName : `${stageName} stage`;
  const heroEyebrow = heroRound
    ? `${stageLabelUp} APPROVAL · ROUND ${roundNo}`
    : `${stageLabelUp} APPROVAL`;

  const heroTitle = !heroRound
    ? `${stageLabelTitle} — not submitted yet`
    : myHeroStep
      ? `Waiting on you — ${whoOf(myHeroStep)}`
      : heroAllApproved
        ? `${stageLabelTitle} approved`
        : heroHasRejected
          ? `${stageLabelTitle} returned`
          : heroPendingWho.length > 0
            ? `In review — waiting on ${heroPendingWho.join(' & ')}`
            : `${stageLabelTitle} in review`;

  const heroSubtitle = !heroRound
    ? activeTab?.st?.blockedReason || 'Approval starts automatically once this stage is submitted.'
    : heroAllApproved
      ? `All approvals complete${lastApprovedDec?.decidedAt ? ` on ${fmtShortDate(lastApprovedDec.decidedAt)}` : ''} · nothing is waiting on you`
      : `Submitted by ${a.picName || a.createdByName || 'Marketing'}${lastApprovedDec ? ` · ${lastApprovedDec.by} approved ${fmtShortDate(lastApprovedDec.decidedAt)}` : ''}`;

  // "Before you decide" summary metrics
  const stageItemScopes = ap.current.filter(
    c => (c.scope === 'DOCUMENT' || c.scope === 'SECTION') && (!activeTab?.stage || !c.stageCode || c.stageCode === activeTab.stage),
  );
  const docScopes = stageItemScopes.filter(c => c.scope === 'DOCUMENT');
  const deedScopes = stageItemScopes.filter(c => c.scope === 'SECTION');
  const approvedDocsCount = docScopes.filter(c => c.steps.length > 0 && c.steps.every(s => s.status === 'APPROVED')).length;
  const pendingDeeds = deedScopes.filter(c => !c.steps.every(s => s.status === 'APPROVED'));
  const ocrDiffCount = Number(a.fapComparison?.diffCount ?? a.ocrDiffCount ?? 0);

  // Filter for Document & Deed approvals list
  const waitingItems = stageItemScopes.filter(c => !(c.steps.length > 0 && c.steps.every(s => s.status === 'APPROVED')));
  const approvedItems = stageItemScopes.filter(c => c.steps.length > 0 && c.steps.every(s => s.status === 'APPROVED'));
  const displayedItems =
    filterMode === 'waiting' ? waitingItems : filterMode === 'approved' ? approvedItems : stageItemScopes;

  // Build chronological Approval History timeline
  const historyEvents: HistoryEvent[] = [];
  if (heroPendingWho.length > 0 && heroRound) {
    const activeLvlIdx = heroLayers.findIndex(l => l.some(s => s.status === 'PENDING'));
    historyEvents.push({
      id: 'now-waiting',
      tone: 'blue',
      title: `Waiting on ${heroPendingWho.join(' & ')} (round ${roundNo}${activeLvlIdx >= 0 ? `, level ${activeLvlIdx + 1}` : ''})`,
      timeText: 'Now',
      sortTime: Number.MAX_SAFE_INTEGER,
    });
  }
  const allScopesForHistory = [...ap.history, ...ap.current];
  for (const sc of allScopesForHistory) {
    const scClean = sc.scopeName.replace(/^(Stage|Group|Document|Section)\s+/i, '');
    for (const st of sc.steps) {
      for (const dec of st.decisions) {
        const isApp = dec.decision === 'APPROVED';
        const t = dec.decidedAt ? new Date(dec.decidedAt).getTime() : 0;
        historyEvents.push({
          id: `${sc.scope}-${sc.roundNo}-${st.id}-${dec.decidedAt}`,
          tone: isApp ? 'green' : 'amber',
          title: isApp
            ? `${whoOf(st)} approved ${scClean} (round ${sc.roundNo})`
            : `Round ${sc.roundNo} returned by ${whoOf(st)} (${dec.by})`,
          note: stripHtml(dec.remarks) || undefined,
          timeText: fmtShortDate(dec.decidedAt),
          sortTime: t,
        });
      }
    }
  }
  historyEvents.sort((x, y) => y.sortTime - x.sortTime);

  const hasEarlierRounds = ap.history.length > 0 || roundNo > 1;
  const jumpToHistory = () => {
    setHistoryOpen(true);
    setTimeout(() => historyRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'}), 40);
  };

  return (
    <section className="r1-wrap" aria-label="Approvals">
      {/* HERO CARD: Stage sub-tabs + Level chain + Before you decide */}
      <div className="r1-card">
        {stageTabInfo.length > 0 && (
          <div className="r1-stage-tabs" role="tablist" aria-label="Approval stages">
            {stageTabInfo.map(t => (
              <button
                key={t.stage}
                type="button"
                role="tab"
                aria-selected={t.stage === activeTab?.stage}
                className={`r1-stage-tab${t.stage === activeTab?.stage ? ' active' : ''}`}
                onClick={() => setSelectedStageCode(t.stage)}
              >
                <span>{t.name}</span>
                <span className={`r1-stage-pill${t.pillTone ? ` ${t.pillTone}` : ''}`}>{t.pillText}</span>
              </button>
            ))}
          </div>
        )}

        <div className="r1-card-pad">
          <div className="r1-appr-hero-top">
            <div>
              <div className={`r1-eyebrow${heroAllApproved ? ' green' : heroRound ? ' blue' : ''}`}>{heroEyebrow}</div>
              <h2>{heroTitle}</h2>
              <p>{heroSubtitle}</p>
              {heroRound?.locked && !myHeroStep && !heroAllApproved && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 8,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    fontSize: 12,
                    color: '#92400e',
                    fontWeight: 600,
                  }}
                >
                  <Lock size={13} />
                  <span>{heroRound.lockedBy || 1} item(s) below must be approved first before this stage can be decided.</span>
                </div>
              )}
            </div>
            {hasEarlierRounds && (
              <button type="button" className="r1-link-btn" onClick={jumpToHistory}>
                Round {Math.max(1, roundNo - 1)} was returned · see history
              </button>
            )}
          </div>

          {heroRound && (
            <div className={`r1-appr-hero-body${myHeroStep ? '' : ' full'}`}>
              {/* Left: Vertical Level Spine + Horizontal Parallel Cards */}
              <div className="r1-levels">
                {heroLayers.map((layer, li) => {
                  const allDone = layer.every(s => s.status === 'APPROVED');
                  const hasRej = layer.some(s => shownStatus(s) === 'REJECTED');
                  const isNow = !allDone && !hasRej && layer.some(s => s.status === 'PENDING');
                  const lvlState = allDone ? 'done' : hasRej ? 'rejected' : isNow ? 'now' : 'next';
                  const lvlLabel = allDone ? 'Complete' : hasRej ? 'Returned' : isNow ? 'In progress' : 'Not started';

                  return (
                    <div key={li} className={`r1-level-row${allDone ? ' done' : ''}`}>
                      <div className="r1-level-spine">
                        <span className={`r1-v-num${allDone ? ' done' : hasRej ? ' rejected' : isNow ? ' active-blue' : ''}`}>
                          {allDone ? (
                            <Check size={13} strokeWidth={3} />
                          ) : hasRej ? (
                            <X size={13} strokeWidth={3} />
                          ) : isNow ? (
                            <span style={{width: 8, height: 8, borderRadius: '50%', background: '#2563eb'}} />
                          ) : null}
                        </span>
                        <div className="r1-level-meta">
                          <span>LEVEL {li + 1}</span>
                          <strong className={lvlState}>{lvlLabel}</strong>
                        </div>
                      </div>

                      <div className="r1-level-cards">
                        {layer.map(step => {
                          const st = shownStatus(step);
                          const sDone = st === 'APPROVED';
                          const sRej = st === 'REJECTED';
                          const sNow = st === 'PENDING';
                          const sYours = sNow && step.canAct;
                          const sPeer = sNow && !step.canAct;
                          const lastDec = step.decisions[step.decisions.length - 1];
                          const cardClass = sDone ? 'done' : sRej ? 'rejected' : sYours ? 'yours' : sPeer ? 'peer' : '';
                          const subClass = sDone ? 'done' : sRej ? 'rejected' : sYours ? 'yours' : sPeer ? 'peer' : '';

                          const subText = sDone && lastDec
                            ? `Approved by ${lastDec.by}${lastDec.decidedAt ? ` · ${fmtShortDate(lastDec.decidedAt)}` : ''}`
                            : sRej && lastDec
                              ? `Returned by ${lastDec.by}${lastDec.decidedAt ? ` · ${fmtShortDate(lastDec.decidedAt)}` : ''}`
                              : sYours
                                ? 'Waiting for your decision'
                                : sPeer
                                  ? myHeroStep && layer.some(x => x.canAct)
                                    ? 'Waiting · parallel with you'
                                    : step.startedAt
                                      ? `Waiting since ${fmtShortDate(step.startedAt)}`
                                      : 'Waiting for decision'
                                  : `Starts after level ${li}`;

                          return (
                            <div key={step.id} className={`r1-appr-card ${cardClass}`}>
                              <span
                                className={`r1-v-num${sDone ? ' done' : sRej ? ' rejected' : sNow ? ' active-blue' : ''}`}
                                style={{width: 20, height: 20, marginTop: 1}}
                              >
                                {sDone ? (
                                  <Check size={11} strokeWidth={3} />
                                ) : sRej ? (
                                  <X size={11} strokeWidth={3} />
                                ) : sNow ? (
                                  <span style={{width: 6, height: 6, borderRadius: '50%', background: '#2563eb'}} />
                                ) : null}
                              </span>
                              <div style={{minWidth: 0}}>
                                <div className="r1-appr-card-title">
                                  {whoOf(step)}
                                  {sYours ? ' (you)' : ''}
                                </div>
                                <div className={`r1-appr-card-sub ${subClass}`}>{subText}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: BEFORE YOU DECIDE box (when user can act on stage) */}
              {myHeroStep && (
                <div className="r1-before-box">
                  <div className="r1-eyebrow">BEFORE YOU DECIDE</div>
                  <div className="r1-before-row">
                    <span className="r1-before-left">
                      <span className="r1-status-icon approved" style={{width: 18, height: 18, marginTop: 0}}>
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span>{stageName} Form</span>
                    </span>
                    <span className="r1-before-right">All sections complete</span>
                  </div>

                  <div className="r1-before-row">
                    <span className="r1-before-left">
                      {docScopes.length > 0 && approvedDocsCount === docScopes.length ? (
                        <span className="r1-status-icon approved" style={{width: 18, height: 18, marginTop: 0}}>
                          <Check size={11} strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="r1-status-icon in-review" style={{width: 18, height: 18, marginTop: 0}}>
                          <AlertCircle size={12} />
                        </span>
                      )}
                      <span>Documents</span>
                    </span>
                    <span className="r1-before-right">
                      {docScopes.length > 0 ? `${approvedDocsCount} of ${docScopes.length} approved` : 'No document approvals'}
                    </span>
                  </div>

                  <div className="r1-before-row">
                    <span className="r1-before-left">
                      {ocrDiffCount === 0 ? (
                        <span className="r1-status-icon approved" style={{width: 18, height: 18, marginTop: 0}}>
                          <Check size={11} strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="r1-status-icon in-review" style={{width: 18, height: 18, marginTop: 0}}>
                          <AlertCircle size={12} />
                        </span>
                      )}
                      <span>OCR comparison</span>
                    </span>
                    <span className="r1-before-right">
                      {ocrDiffCount} {ocrDiffCount === 1 ? 'difference' : 'differences'}
                    </span>
                  </div>

                  <div className="r1-before-row">
                    <span className="r1-before-left">
                      {pendingDeeds.length === 0 && (deedScopes.length > 0 || deeds.length === 0 || deeds.some(d => d.approvalStatus === 'APPROVED')) ? (
                        <span className="r1-status-icon approved" style={{width: 18, height: 18, marginTop: 0}}>
                          <Check size={11} strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="r1-status-icon in-review" style={{width: 18, height: 18, marginTop: 0}}>
                          <AlertCircle size={12} />
                        </span>
                      )}
                      <span>Legal deeds</span>
                    </span>
                    <span className="r1-before-right">
                      {pendingDeeds.length > 0
                        ? `${pendingDeeds.length} still in review`
                        : deedScopes.length > 0
                          ? 'All approved'
                          : deeds.length > 0 && !deeds.some(d => d.approvalStatus === 'APPROVED')
                            ? 'Not submitted yet'
                            : 'None required'}
                    </span>
                  </div>

                  {heroRound.locked && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        fontSize: 11.5,
                        color: '#92400e',
                        fontWeight: 600,
                      }}
                    >
                      <Lock size={13} style={{flexShrink: 0}} />
                      <span>{heroRound.lockedBy || 1} item(s) below must be approved first.</span>
                    </div>
                  )}

                  <div className="r1-before-actions">
                    <button type="button" className="r1-btn-reject" onClick={() => decide(myHeroStep, 'REJECTED')}>
                      <X size={14} strokeWidth={2.5} /> Reject
                    </button>
                    <button type="button" className="r1-btn-approve" onClick={() => decide(myHeroStep, 'APPROVED')}>
                      <Check size={14} strokeWidth={2.5} /> Approve
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Group Approval action strip when current user can act on the Group */}
          {groupRound && myGroupStep && (
            <div
              style={{
                marginTop: 20,
                padding: '14px 18px',
                borderRadius: 10,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div className="r1-eyebrow blue">GROUP APPROVAL · ROUND {groupRound.roundNo}</div>
                <div style={{fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2}}>
                  {groupRound.scopeName} — Waiting on you ({whoOf(myGroupStep)})
                </div>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <button type="button" className="r1-btn-reject" onClick={() => decide(myGroupStep, 'REJECTED')}>
                  <X size={14} strokeWidth={2.5} /> Reject
                </button>
                <button type="button" className="r1-btn-approve" onClick={() => decide(myGroupStep, 'APPROVED')}>
                  <Check size={14} strokeWidth={2.5} /> Approve
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MIDDLE CARD: Document & deed approvals */}
      <div className="r1-card">
        <div className="r1-list-head">
          <h3>
            Document &amp; deed approvals <span style={{color: '#64748b', fontWeight: 500}}>· {stageItemScopes.length}</span>
          </h3>
          <div className="r1-seg-filter" role="tablist" aria-label="Filter items">
            <button type="button" className={filterMode === 'all' ? 'active' : ''} onClick={() => setFilterMode('all')}>
              All {stageItemScopes.length}
            </button>
            <button type="button" className={filterMode === 'waiting' ? 'active' : ''} onClick={() => setFilterMode('waiting')}>
              Waiting {waitingItems.length}
            </button>
            <button type="button" className={filterMode === 'approved' ? 'active' : ''} onClick={() => setFilterMode('approved')}>
              Approved {approvedItems.length}
            </button>
          </div>
        </div>

        {displayedItems.length === 0 ? (
          <div style={{padding: '24px', textAlign: 'center', color: '#64748b', fontSize: 13}}>
            No document or deed approvals in this view.
          </div>
        ) : (
          <div>
            {displayedItems.map(sc => {
              const isDoc = sc.scope === 'DOCUMENT';
              const isDeed = sc.scope === 'SECTION';
              const doc = isDoc
                ? docs.find(
                    x =>
                      x.id === sc.checklistId ||
                      (x.documentCode && sc.documentCode && x.documentCode === sc.documentCode),
                  )
                : null;
              const deed = isDeed && sc.subjectId ? deeds.find(d => d.id === sc.subjectId) : null;
              const files: any[] = doc?.files || deed?.files || [];
              const firstFile = files[0];
              const isPdf = (firstFile?.mimeType || '').includes('pdf') || String(firstFile?.fileName || '').toLowerCase().endsWith('.pdf');
              const ps = firstFile ? createPreviewState(doc || {documentName: sc.scopeName, files}, firstFile) : null;

              const rawTitle = sc.scopeName.replace(/^(Document|Section)\s+/i, '').trim();
              const title = isDeed && deed?.deedNumber && !rawTitle.includes(deed.deedNumber)
                ? `Deed ${deed.deedNumber} · ${rawTitle}`
                : rawTitle;

              const layers = layersOf(sc.steps);
              const allApproved = sc.steps.length > 0 && sc.steps.every(s => s.status === 'APPROVED');
              const hasReopened = sc.steps.some(s => s.reopened);
              const hasRejected = sc.steps.some(s => shownStatus(s) === 'REJECTED');
              const pendingWho = [...new Set(sc.steps.filter(s => s.status === 'PENDING').map(whoOf))];
              const myItemStep = sc.steps.find(s => s.canAct);

              const statusTone = allApproved ? 'green' : hasRejected ? 'red' : hasReopened || pendingWho.length > 0 ? 'amber' : 'gray';
              const statusTitle = allApproved ? 'Approved' : hasRejected ? 'Returned' : hasReopened ? 'Opened again' : myItemStep ? 'Waiting on you' : 'In review';
              const statusSub = allApproved
                ? 'All approvals complete'
                : hasRejected
                  ? 'Returned for revision'
                  : hasReopened
                    ? 'Submit document for approval again'
                    : pendingWho.length > 0
                      ? `Waiting on ${pendingWho.join(' & ')}`
                      : 'Pending previous step';

              return (
                <div
                  key={`${sc.scope}-${sc.checklistId || sc.subjectId || sc.scopeName}`}
                  className="r1-doc-deed-row"
                  onClick={() => setDrawerScope(sc)}
                >
                  {/* Col 1: Icon + Title + File chip */}
                  <div className="r1-chk-doc-cell">
                    <span className={`r1-status-icon ${allApproved ? 'approved' : hasRejected ? 'rejected' : 'in-review'}`}>
                      {allApproved ? <Check size={12} strokeWidth={3} /> : hasRejected ? <X size={12} strokeWidth={3} /> : <Clock size={12} />}
                    </span>
                    <div style={{minWidth: 0}}>
                      <div style={{fontSize: 13.5, fontWeight: 700, color: '#0f172a'}}>{title}</div>
                      <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap'}}>
                        {files.length > 0 ? (
                          <>
                            <button
                              type="button"
                              className="r1-file-chip"
                              onClick={e => {
                                e.stopPropagation();
                                if (ps) setPreviewModal(ps);
                              }}
                            >
                              <Paperclip size={11} /> {files.length} {files.length === 1 ? 'file' : 'files'} ›
                            </button>
                            <span style={{fontSize: 11.5, color: '#64748b'}}>
                              {isPdf ? 'PDF' : 'FILE'}
                              {firstFile?.fileSize ? ` · ${fmtSize(firstFile.fileSize)}` : ''}
                            </span>
                          </>
                        ) : (
                          <span style={{fontSize: 11.5, color: '#94a3b8'}}>No file attached</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Col 2: Horizontal step-dots chain */}
                  <div style={{display: 'flex', justifyContent: 'center'}}>
                    <div className="r1-chain">
                      {layers.map((layer, li) => {
                        const lDone = layer.every(s => s.status === 'APPROVED');
                        const lRej = layer.some(s => shownStatus(s) === 'REJECTED');
                        const lNow = !lDone && !lRej && layer.some(s => s.status === 'PENDING');
                        const dotCls = lDone ? 'done' : lRej ? 'rejected' : lNow ? 'now' : '';
                        const roleLbl = layer.map(s => shortRole(whoOf(s))).join(' + ');
                        return (
                          <Fragment key={li}>
                            {li > 0 && <span className={`r1-chain-line${layers[li - 1].every(s => s.status === 'APPROVED') ? ' done' : ''}`} />}
                            <span className="r1-chain-node">
                              <span className={`r1-chain-dot ${dotCls}`}>
                                {lDone ? <Check size={11} strokeWidth={3} /> : lRej ? <X size={11} strokeWidth={3} /> : null}
                              </span>
                              <span className={`r1-chain-lbl ${dotCls}`}>{roleLbl}</span>
                            </span>
                          </Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Col 3: Status text */}
                  <div>
                    <div className={`r1-chk-status-title ${statusTone}`}>{statusTitle}</div>
                    <div className="r1-chk-status-sub">{statusSub}</div>
                  </div>

                  {/* Col 4: Chevron */}
                  <div style={{display: 'flex', justifyContent: 'flex-end', color: '#94a3b8'}}>
                    <ChevronRight size={16} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOTTOM CARD: Collapsible Approval history */}
      <div className="r1-card" ref={historyRef}>
        <div
          className="r1-list-head"
          style={{borderBottom: historyOpen ? '1px solid #f1f5f9' : 'none', cursor: 'pointer'}}
          onClick={() => setHistoryOpen(o => !o)}
        >
          <h3>Approval history</h3>
          <button
            type="button"
            className="r1-link-btn"
            onClick={e => {
              e.stopPropagation();
              setHistoryOpen(o => !o);
            }}
          >
            {historyOpen ? 'Hide' : 'Show all'}
          </button>
        </div>

        {historyOpen && (
          <div style={{padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14}}>
            {historyEvents.length === 0 ? (
              <div style={{fontSize: 13, color: '#64748b'}}>No approval events recorded yet.</div>
            ) : (
              historyEvents.map(ev => (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0}}>
                    <span
                      className={`r1-status-icon ${ev.tone === 'green' ? 'approved' : ev.tone === 'amber' ? 'in-review' : ev.tone === 'red' ? 'rejected' : 'ready'}`}
                      style={{width: 20, height: 20, marginTop: 1}}
                    >
                      {ev.tone === 'green' ? (
                        <Check size={11} strokeWidth={3} />
                      ) : ev.tone === 'amber' ? (
                        <AlertCircle size={12} />
                      ) : ev.tone === 'red' ? (
                        <X size={11} strokeWidth={3} />
                      ) : null}
                    </span>
                    <div style={{minWidth: 0}}>
                      <div style={{fontSize: 13, fontWeight: 700, color: '#0f172a'}}>{ev.title}</div>
                      {ev.note && (
                        <div style={{fontSize: 12, color: '#64748b', marginTop: 2}}>
                          “{ev.note}”
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={{fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0}}>
                    {ev.timeText}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Slide-over Right Drawer for Document / Deed Approval */}
      {drawerScope && (
        <ApprovalItemDrawer
          scope={drawerScope}
          onClose={() => setDrawerScope(null)}
          onDecide={decide}
          onPreview={setPreviewModal}
        />
      )}

      {/* Existing Document Preview Modal */}
      {previewModal && <DocumentPreviewModal preview={previewModal} onClose={() => setPreviewModal(null)} />}
    </section>
  );
}
