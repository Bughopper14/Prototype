/**
 * The SUBMITTER's view of the approval of one application (Redesign 1):
 * 2-column layout with stage readiness checklist on the left, and "After you submit" + "Other stages" cards on the right.
 */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {layersOf, reopenedStep, whoOf, type Approval} from '@/features/applications/components/workspace/approval-shared';
import {screenOf} from '@/features/applications/lib/workspace/stage';
import {api} from '@/shared/lib/api';
import {date} from '@/shared/lib/format';
import {SCREEN} from '@/shared/master-data';
import {AlertTriangle, ArrowRight, Check, CheckCircle2, Circle, CircleDot, Clock} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';

type Gap = {target: string; label: string; detail?: string};

type StageProgress = {
  stage: string;
  name: string;
  group: string;
  groupCode?: string;
  submitted: boolean;
  completed: boolean;
  canSubmit: boolean;
  blockedReason: string | null;
};

const GAP_GROUPS: {target: string; eyebrow: string; linkLabel: string; stage?: string; tab: number}[] = [
  {target: 'FAP_FORM', eyebrow: 'FAP FORM', linkLabel: 'Open FAP Form', stage: SCREEN.FAP, tab: 0},
  {target: 'PRE_ANALYSIS', eyebrow: 'PRE-ANALYSIS', linkLabel: 'Open Pre-analysis', stage: SCREEN.PRE_ANALYSIS, tab: 8},
  {target: 'DOCUMENTS', eyebrow: 'DOCUMENTS', linkLabel: 'Open Document Checklist', tab: 9},
  {target: 'LEGAL', eyebrow: 'LEGAL', linkLabel: 'Open Legal', stage: SCREEN.FAP, tab: 5},
  {target: 'STAKEHOLDERS', eyebrow: 'STAKEHOLDERS', linkLabel: 'Open Stakeholders', stage: SCREEN.FAP, tab: 1},
];

function formatStageTitle(name: string): string {
  const clean = (name || 'Stage').trim();
  return /\bstage\b/i.test(clean) ? clean : `${clean} Stage`;
}

export function ApprovalPanel() {
  const {a, draft, user, isAdminUser, activeStage, setActiveStage, setTab, tabOrder, setError, setSubmitStageCode} = useWorkspace();
  const canViewApprovals = tabOrder.includes(10);

  const stages: StageProgress[] = useMemo(() => (a.stageProgress || []) as StageProgress[], [a.stageProgress]);
  const wfStages: any[] = useMemo(() => a.workflow?.stages || [], [a.workflow?.stages]);

  // Match the currently selected workspace stage to a workflow stageProgress entry
  const matchedStageCode = useMemo(() => {
    const byScreen = stages.find(st => {
      const wf = wfStages.find((w: any) => w.code === st.stage);
      return wf && screenOf(wf) === activeStage;
    });
    return byScreen?.stage || stages[0]?.stage || '';
  }, [stages, wfStages, activeStage]);

  const [selectedStageCode, setSelectedStageCode] = useState<string>(matchedStageCode);
  useEffect(() => {
    if (matchedStageCode) setSelectedStageCode(matchedStageCode);
  }, [matchedStageCode]);

  const [gapsByStage, setGapsByStage] = useState<Record<string, Gap[]>>({});
  const [loadingCheck, setLoadingCheck] = useState(false);

  const openStages = useMemo(
    () => stages.filter(st => st.canSubmit && !st.submitted && !st.completed).map(st => st.stage),
    [stages],
  );
  const openKey = openStages.join(',');

  useEffect(() => {
    if (draft.isNew || !a.id || !openStages.length) {
      setGapsByStage({});
      return;
    }
    let alive = true;
    setLoadingCheck(true);
    void Promise.all(
      openStages.map(code =>
        api(`/applications/${a.id}/stages/${encodeURIComponent(code)}/check`)
          .then((r: any) => [code, Array.isArray(r?.missing) ? (r.missing as Gap[]) : []] as const)
          .catch(() => [code, [] as Gap[]] as const),
      ),
    ).then(rows => {
      if (!alive) return;
      setGapsByStage(Object.fromEntries(rows));
      setLoadingCheck(false);
    });
    return () => {
      alive = false;
    };
  }, [a.id, openKey, draft.isNew]);

  if (draft.isNew || !a.approval) return null;

  const ap = a.approval as Approval;
  const canSubmitRole = isAdminUser || (user?.authorities || []).includes('CRM_WORKFLOW_SUBMIT');
  const currentStage = stages.find(s => s.stage === selectedStageCode) || stages[0];
  if (!currentStage) return null;

  const stageTitle = formatStageTitle(currentStage.name);
  const currentGaps: Gap[] = gapsByStage[currentStage.stage] || [];
  const missingCount = currentGaps.length;

  // Group gaps into known buckets + OTHER fallback
  const groupedGaps = GAP_GROUPS.map(g => ({
    ...g,
    items: currentGaps.filter(item => item.target === g.target),
  })).filter(g => g.items.length > 0);

  const knownTargets = new Set(GAP_GROUPS.map(g => g.target));
  const otherGaps = currentGaps.filter(item => !knownTargets.has(item.target));

  // Rejected & reopened info (preserved from existing ApprovalPanel)
  const rejected = ap.current.flatMap(c =>
    c.steps
      .filter(s => s.status === 'REJECTED' && !s.reopened)
      .map(s => ({scope: c.scopeName, kind: c.scope, step: s, decision: s.decisions.find(d => d.decision === 'REJECTED')})),
  );
  const reopened = ap.current.filter(c => c.steps.some(reopenedStep));
  const stageNameOf = (code: string) => stages.find(s => s.stage === code)?.name ?? code;
  const itemNameOf = (c: {scope: string; scopeName: string}) =>
    c.scope === 'DOCUMENT' ? c.scopeName.replace(/^Document\s+/, '') : c.scopeName.replace(/^.*·\s*/, '');
  const reopenedByStage = [...new Set(reopened.map(c => c.stageCode || ''))].filter(Boolean).map(code => ({
    code,
    name: stageNameOf(code),
    stageItself: reopened.some(c => c.scope === 'STAGE' && c.stageCode === code),
    documents: [...new Set(reopened.filter(c => c.scope === 'DOCUMENT' && c.stageCode === code).map(itemNameOf))],
    deeds: [...new Set(reopened.filter(c => c.scope === 'SECTION' && c.stageCode === code).map(itemNameOf))],
  }));

  // Group approval rows for the "AFTER YOU SUBMIT" card
  const groupRows = ((a.approvalPlaces || []) as any[])
    .filter(p => p.scope === 'GROUP')
    .map(p => {
      const group = (a.workflow?.groups || []).find((g: any) => g.code === p.groupCode);
      const round = ap.current.find(c => c.scope === 'GROUP' && c.groupCode === p.groupCode);
      const steps = round?.steps || [];
      const state = !round
        ? 'NONE'
        : steps.some(x => x.status === 'REJECTED' && !x.reopened)
          ? 'REJECTED'
          : steps.some(x => x.reopened)
            ? 'REOPENED'
            : steps.every(x => x.status === 'APPROVED')
              ? 'APPROVED'
              : 'OPEN';
      const waiting = [...new Set(steps.filter(x => x.status === 'PENDING').map(whoOf))];
      return {
        code: p.groupCode as string,
        name: (group?.name || p.groupCode) as string,
        stageCodes: (group?.stageCodes || []) as string[],
        approval: (p.approvalName || p.approvalCode || '') as string,
        state,
        waiting,
      };
    });

  // Approval levels for the active stage ("AFTER YOU SUBMIT")
  const activeStageRound = ap.current.find(c => c.scope === 'STAGE' && c.stageCode === currentStage.stage);
  const activeStagePlace = ((a.approvalPlaces || []) as any[]).find(p => p.scope === 'STAGE' && p.stageCode === currentStage.stage);
  const stageLayers = activeStageRound?.steps?.length ? layersOf(activeStageRound.steps) : [];
  const activeGroup = groupRows.find(
    g => g.stageCodes.includes(currentStage.stage) || (currentStage.groupCode && g.code === currentStage.groupCode),
  );
  const otherStagesInGroup = activeGroup
    ? activeGroup.stageCodes
        .filter(code => code !== currentStage.stage)
        .map(code => stageNameOf(code))
    : [];

  // Progress bar calculation
  const isReady = !currentStage.completed && !currentStage.submitted && currentStage.canSubmit && missingCount === 0 && !loadingCheck;
  const progressPct = currentStage.completed || currentStage.submitted || isReady ? 100 : Math.max(12, Math.min(82, Math.round((10 / (10 + missingCount * 2)) * 100)));
  const progressColor = currentStage.completed || isReady ? '#16a34a' : currentStage.submitted ? '#2563eb' : '#d97706';

  // Checklist summary sections when 0 items are missing
  const wfCurrent = wfStages.find((w: any) => w.code === currentStage.stage);
  const currentScreen = wfCurrent ? screenOf(wfCurrent) : activeStage;
  const completedSections =
    currentScreen === SCREEN.PRE_ANALYSIS
      ? [
          {label: 'Pre-analysis Form', tab: 8},
          {label: 'Documents', tab: 9},
        ]
      : currentScreen === SCREEN.FAP
        ? [
            {label: 'FAP Form', tab: 0},
            {label: 'Documents', tab: 9},
            {label: 'Legal', tab: 5},
            {label: 'Stakeholders', tab: 1},
          ]
        : [
            {label: `${currentStage.name} Requirements`, tab: 6},
            {label: 'Documents', tab: 9},
          ];

  const openSection = (stageScreen: string | undefined, tabIdx: number) => {
    setError('');
    if (stageScreen) setActiveStage(stageScreen);
    setTab(tabIdx);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const openOtherStage = (st: StageProgress) => {
    setSelectedStageCode(st.stage);
    const wf = wfStages.find((w: any) => w.code === st.stage);
    if (wf) setActiveStage(screenOf(wf));
  };

  const handleSubmitClick = () => {
    setError('');
    setSubmitStageCode(currentStage.stage);
  };

  const otherStages = stages.filter(s => s.stage !== currentStage.stage);

  return (
    <section className="r1-wrap" aria-label="Submit for approval">
      {rejected.map(r => (
        <div
          key={r.step.id}
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '14px 18px',
            borderRadius: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
          }}
        >
          <AlertTriangle size={18} style={{flexShrink: 0, marginTop: 2, color: '#dc2626'}} />
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontWeight: 700, fontSize: 13.5, color: '#991b1b'}}>
              {r.scope}: “{r.step.name}” was returned
            </div>
            {r.decision?.remarks ? (
              <div
                style={{margin: '4px 0 6px', fontSize: 13, color: '#1e293b'}}
                dangerouslySetInnerHTML={{__html: r.decision.remarks}}
              />
            ) : (
              <p style={{margin: '4px 0 6px', fontSize: 13, color: '#475569'}}>No reason was written.</p>
            )}
            {r.kind === 'GROUP' &&
              reopenedByStage.map(st => (
                <div key={st.code} style={{margin: '6px 0 8px', fontSize: 12.5, color: '#334155'}}>
                  <b>Stage opened again: {st.name}</b>
                  {(st.documents.length > 0 || st.deeds.length > 0) && (
                    <ul style={{margin: '4px 0 0 18px', padding: 0}}>
                      {st.documents.map(name => (
                        <li key={'d-' + name}>Document · {name}</li>
                      ))}
                      {st.deeds.map(name => (
                        <li key={'e-' + name}>Legal deed · {name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            <div style={{fontSize: 11.5, color: '#64748b'}}>
              {r.decision?.by}
              {r.decision?.decidedAt ? ` · ${date(r.decision.decidedAt)}` : ''}
              {r.decision?.via === 'LARK' ? ' · from Lark' : ''}
            </div>
          </div>
        </div>
      ))}

      <div className="r1-submit-grid">
        {/* LEFT MAIN CARD */}
        <div className="r1-card">
          <div className="r1-card-pad">
            <div className="r1-submit-head">
              <div>
                <h2>Submit {stageTitle}</h2>
                <p>
                  {currentStage.completed
                    ? `All approvals for the ${stageTitle} are complete.`
                    : currentStage.submitted
                      ? `The ${stageTitle} has been submitted and is locked while being reviewed.`
                      : !currentStage.canSubmit
                        ? currentStage.blockedReason || `This stage cannot be submitted yet.`
                        : missingCount > 0
                          ? `Finish these items, then send the ${stageTitle} for approval. The stage is locked while it is being reviewed.`
                          : `Everything needed is complete. Send the ${stageTitle} for approval.`}
                </p>
              </div>
              {currentStage.completed ? (
                <span className="r1-pill green">Approved</span>
              ) : currentStage.submitted ? (
                <span className="r1-pill blue">In approval</span>
              ) : !currentStage.canSubmit ? (
                <span className="r1-pill gray">Locked</span>
              ) : loadingCheck ? (
                <span className="r1-pill gray">Checking…</span>
              ) : missingCount > 0 ? (
                <span className="r1-pill amber">
                  {missingCount} {missingCount === 1 ? 'item' : 'items'} left
                </span>
              ) : (
                <span className="r1-pill green">Ready to submit</span>
              )}
            </div>

            <div className="r1-progress-track" aria-hidden>
              <div className="r1-progress-fill" style={{width: `${progressPct}%`, background: progressColor}} />
            </div>

            {/* Missing items grouped by section */}
            {!currentStage.completed && !currentStage.submitted && currentStage.canSubmit && missingCount > 0 ? (
              <div>
                {groupedGaps.map(group => (
                  <div key={group.target} className="r1-submit-group">
                    <div className="r1-submit-group-head">
                      <span className="r1-eyebrow">
                        {group.eyebrow} · {group.items.length}
                      </span>
                      <button
                        type="button"
                        className="r1-link-btn"
                        onClick={() => openSection(group.stage, group.tab)}
                      >
                        {group.linkLabel} <ArrowRight size={13} />
                      </button>
                    </div>
                    <div className="r1-submit-rows">
                      {group.items.map((gap, idx) => (
                        <div key={`${group.target}-${idx}`} className="r1-submit-row">
                          <span className="r1-submit-row-left">
                            <Circle size={18} strokeWidth={1.6} color="#cbd5e1" style={{flexShrink: 0}} />
                            <span>{gap.label}</span>
                          </span>
                          <span className="r1-submit-row-right">
                            {gap.detail === 'Belum disetujui' ? "Haven't approved yet" : gap.detail || 'Required'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {otherGaps.length > 0 && (
                  <div className="r1-submit-group">
                    <div className="r1-submit-group-head">
                      <span className="r1-eyebrow">OTHER · {otherGaps.length}</span>
                    </div>
                    <div className="r1-submit-rows">
                      {otherGaps.map((gap, idx) => (
                        <div key={`other-${idx}`} className="r1-submit-row">
                          <span className="r1-submit-row-left">
                            <Circle size={18} strokeWidth={1.6} color="#cbd5e1" style={{flexShrink: 0}} />
                            <span>{gap.label}</span>
                          </span>
                          <span className="r1-submit-row-right">{gap.detail || 'Required'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Ready / Submitted / Approved state: green checked section cards */
              <div className="r1-submit-rows" style={{marginTop: 18}}>
                {completedSections.map(sec => (
                  <div
                    key={sec.label}
                    className="r1-submit-row"
                    style={{cursor: 'pointer'}}
                    onClick={() => openSection(currentScreen, sec.tab)}
                  >
                    <span className="r1-submit-row-left">
                      <span className="r1-status-icon approved" style={{width: 20, height: 20, marginTop: 0}}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{sec.label}</span>
                    </span>
                    <span className="r1-submit-row-right" style={{color: '#15803d', fontWeight: 600}}>
                      Complete
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="r1-submit-footer">
            {currentStage.completed ? (
              <>
                <span className="r1-submit-footer-note" style={{color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 6}}>
                  <CheckCircle2 size={15} /> {stageTitle} approved
                </span>
                {canViewApprovals && (
                  <button type="button" className="r1-btn-outline" onClick={() => setTab(10)}>
                    View Approvals <ArrowRight size={14} />
                  </button>
                )}
              </>
            ) : currentStage.submitted ? (
              <>
                <span className="r1-submit-footer-note" style={{color: '#1d4ed8', display: 'inline-flex', alignItems: 'center', gap: 6}}>
                  <Clock size={15} /> Waiting for approvers
                </span>
                {canViewApprovals && (
                  <button type="button" className="r1-btn-navy" onClick={() => setTab(10)}>
                    View Approvals <ArrowRight size={14} />
                  </button>
                )}
              </>
            ) : (
              <>
                {missingCount > 0 && currentStage.canSubmit && (
                  <span className="r1-submit-footer-note">
                    Complete {missingCount} {missingCount === 1 ? 'item' : 'items'} to submit
                  </span>
                )}
                {!currentStage.canSubmit && (
                  <span className="r1-submit-footer-note">{currentStage.blockedReason || 'Not ready to submit yet'}</span>
                )}
                <button
                  type="button"
                  className="r1-btn-navy"
                  disabled={!currentStage.canSubmit || !canSubmitRole || loadingCheck || missingCount > 0}
                  onClick={handleSubmitClick}
                >
                  Submit {stageTitle}
                </button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="r1-side-stack">
          {/* Card 1: AFTER YOU SUBMIT */}
          <div className="r1-card r1-card-pad">
            <div className="r1-eyebrow">AFTER YOU SUBMIT</div>
            <div className="r1-v-timeline">
              {stageLayers.length > 0 ? (
                stageLayers.map((layer, idx) => {
                  const allDone = layer.every(s => s.status === 'APPROVED');
                  const isNow = layer.some(s => s.status === 'PENDING');
                  const isRej = layer.some(s => s.status === 'REJECTED' && !s.reopened);
                  const names = layer.map(whoOf).join(' & ');
                  return (
                    <div key={idx} className={`r1-v-step${allDone ? ' done' : ''}`}>
                      <span className={`r1-v-num${allDone ? ' done' : isRej ? ' rejected' : isNow ? ' active-blue' : ''}`}>
                        {allDone ? <Check size={13} strokeWidth={3} /> : idx + 1}
                      </span>
                      <div className="r1-v-body">
                        <span className="r1-v-lvl">Level {idx + 1}</span>
                        <span className="r1-v-title">{names}</span>
                        <span className={`r1-v-sub${allDone ? ' green' : isRej ? ' red' : isNow ? ' blue' : ''}`}>
                          {layer.length === 1 ? '1 approver' : `${layer.length} approvers · all must approve`}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="r1-v-step">
                  <span className="r1-v-num">1</span>
                  <div className="r1-v-body">
                    <span className="r1-v-lvl">Stage approval</span>
                    <span className="r1-v-title">{activeStagePlace?.approvalName || `${currentStage.name} approval`}</span>
                    <span className="r1-v-sub">Starts automatically after you submit</span>
                  </div>
                </div>
              )}

              {activeGroup && (
                <div className={`r1-v-step${activeGroup.state === 'APPROVED' ? ' done' : ''}`}>
                  <span className={`r1-v-num${activeGroup.state === 'APPROVED' ? ' done' : activeGroup.state === 'OPEN' ? ' active-blue' : ''}`}>
                    {activeGroup.state === 'APPROVED' ? <Check size={13} strokeWidth={3} /> : <ArrowRight size={13} />}
                  </span>
                  <div className="r1-v-body">
                    <span className="r1-v-lvl">Then</span>
                    <span className="r1-v-title">Group {activeGroup.name} approval</span>
                    <span className={`r1-v-sub${activeGroup.state === 'APPROVED' ? ' green' : activeGroup.state === 'OPEN' ? ' blue' : ''}`}>
                      {activeGroup.state === 'APPROVED'
                        ? 'Approved'
                        : activeGroup.state === 'OPEN'
                          ? `Waiting${activeGroup.waiting.length ? ` on ${activeGroup.waiting.join(', ')}` : ''}`
                          : otherStagesInGroup.length > 0
                            ? `Starts when ${otherStagesInGroup.join(' & ')} ${otherStagesInGroup.length === 1 ? 'is' : 'are'} also approved`
                            : 'Starts when all stages in this group are approved'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <p style={{margin: '14px 0 0', fontSize: 12, color: '#64748b'}}>
              If something is rejected, the stage opens again for revision.
            </p>
          </div>

          {/* Card 2: OTHER STAGES */}
          {otherStages.length > 0 && (
            <div className="r1-card r1-card-pad">
              <div className="r1-eyebrow">OTHER STAGES</div>
              <div className="r1-other-stages">
                {otherStages.map(st => {
                  const stMissing = gapsByStage[st.stage]?.length ?? 0;
                  const canOpen = st.canSubmit || st.submitted || st.completed;
                  return (
                    <div key={st.stage} className="r1-other-stage-row">
                      <div style={{display: 'flex', alignItems: 'flex-start', gap: 9, minWidth: 0}}>
                        {st.completed ? (
                          <CheckCircle2 size={16} color="#16a34a" style={{flexShrink: 0, marginTop: 2}} />
                        ) : st.submitted || st.canSubmit ? (
                          <CircleDot size={16} color="#00285a" style={{flexShrink: 0, marginTop: 2}} />
                        ) : (
                          <Circle size={16} strokeDasharray="3 2" color="#94a3b8" style={{flexShrink: 0, marginTop: 2}} />
                        )}
                        <div style={{minWidth: 0}}>
                          <div style={{fontSize: 13.5, fontWeight: 700, color: '#0f172a'}}>{st.name}</div>
                          {st.completed ? (
                            <div style={{fontSize: 12, color: '#15803d', fontWeight: 600}}>Approved</div>
                          ) : st.submitted ? (
                            <div style={{fontSize: 12, color: '#1d4ed8', fontWeight: 600}}>In approval</div>
                          ) : st.canSubmit ? (
                            <div style={{fontSize: 12, color: stMissing > 0 ? '#b45309' : '#15803d', fontWeight: 600}}>
                              {stMissing > 0 ? `${stMissing} ${stMissing === 1 ? 'item' : 'items'} left` : 'Ready to submit'}
                            </div>
                          ) : (
                            <div style={{fontSize: 12, color: '#64748b'}}>{st.group}</div>
                          )}
                        </div>
                      </div>
                      {canOpen ? (
                        <button type="button" className="r1-link-btn" onClick={() => openOtherStage(st)}>
                          Open <ArrowRight size={13} />
                        </button>
                      ) : (
                        <span style={{fontSize: 12, color: '#64748b', textAlign: 'right'}}>
                          {st.blockedReason || 'Locked'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
