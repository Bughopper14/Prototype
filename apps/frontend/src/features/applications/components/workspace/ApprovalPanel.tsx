/**
 * Submit tab: shows what is still missing for the active stage before it can be submitted for approval,
 * the approval levels that run after submission, and quick links to other stages.
 */
import {useEffect, useMemo, useState} from 'react';
import {AlertTriangle, ArrowRight, Check, CheckCircle2, Circle, Clock} from 'lucide-react';
import {api} from '@/shared/lib/api';
import {hasAuthority} from '@/shared/lib/auth';
import {date} from '@/shared/lib/format';
import {SCREEN} from '@/shared/master-data';
import {screenOf} from '@/features/applications/lib/workspace/stage';
import {GAP_PLACE, type Gap} from './dialogs/ApprovalDialogs';
import {useWorkspace} from './WorkspaceContext';
import './ApprovalPanel.css';

type StageProgressItem = {
  stage: string;
  name: string;
  group: string;
  groupCode?: string;
  submitted: boolean;
  completed: boolean;
  canSubmit: boolean;
  blockedReason: string | null;
};

type ApprovalPlace = {
  scope: string;
  stageCode?: string | null;
  groupCode?: string | null;
  approvalName?: string | null;
  levels?: {levelNo: number; authorityName: string; isPicMarketing?: boolean}[];
};

const TARGET_LABEL: Record<string, string> = {
  FAP_FORM: 'FAP FORM',
  PRE_ANALYSIS: 'PRE ANALYSIS FORM',
  FINANCIAL_STATEMENTS: 'FINANCIAL STATEMENTS',
  LEGAL: 'LEGAL DEEDS',
  DOCUMENTS: 'DOCUMENTS',
};

const FIELD_LIMIT = 8;

export function ApprovalPanel() {
  const {a, user, isAdminUser, setSubmitStageCode, activeStage, setActiveStage, setTab} = useWorkspace();
  const canSubmitRole = isAdminUser || hasAuthority(user, 'CREATE_EDIT_APPLICATION');
  const stages: StageProgressItem[] = a.stageProgress || [];
  const workflowStages: any[] = a.workflow?.stages || [];

  const defaultStageCode = useMemo(() => {
    const matching = stages.filter(st => {
      const wf = workflowStages.find(w => w.code === st.stage);
      return wf && screenOf(wf) === activeStage;
    });
    const pick =
      matching.find(st => st.canSubmit && !st.submitted) ||
      matching[0] ||
      stages.find(st => st.canSubmit && !st.submitted) ||
      stages[0];
    return pick?.stage || '';
  }, [stages, workflowStages, activeStage]);

  const [selectedStageCode, setSelectedStageCode] = useState<string>(defaultStageCode);
  useEffect(() => {
    setSelectedStageCode(defaultStageCode);
  }, [defaultStageCode]);

  const [missingByStage, setMissingByStage] = useState<Record<string, Gap[]>>({});
  const [expandedTargets, setExpandedTargets] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(false);

  const openStagesKey = stages
    .filter(st => st.canSubmit && !st.submitted)
    .map(st => st.stage)
    .join(',');

  useEffect(() => {
    const toCheck = stages.filter(st => st.canSubmit && !st.submitted).map(st => st.stage);
    if (!toCheck.length) {
      setMissingByStage({});
      return;
    }
    let alive = true;
    setChecking(true);
    Promise.all(
      toCheck.map(code =>
        api(`/applications/${a.id}/stages/${encodeURIComponent(code)}/check`)
          .then((r: any) => [code, Array.isArray(r?.missing) ? (r.missing as Gap[]) : []] as const)
          .catch(() => [code, [] as Gap[]] as const),
      ),
    )
      .then(entries => {
        if (!alive) return;
        const next: Record<string, Gap[]> = {};
        for (const [code, gaps] of entries) next[code] = gaps;
        setMissingByStage(next);
      })
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [a.id, a.updatedAt, openStagesKey]);

  const selectedStage = stages.find(st => st.stage === selectedStageCode) || stages[0];
  const selectedWfStage = workflowStages.find(w => w.code === selectedStage?.stage);
  const selectedScreen = selectedWfStage ? screenOf(selectedWfStage) : activeStage;

  const gaps = selectedStage ? missingByStage[selectedStage.stage] || [] : [];
  const missingCount = gaps.length;

  const groupedGaps = useMemo(() => {
    const groups = new Map<string, Gap[]>();
    for (const g of gaps) {
      const key = g.target || 'OTHER';
      const arr = groups.get(key) || [];
      arr.push(g);
      groups.set(key, arr);
    }
    return [...groups.entries()];
  }, [gaps]);

  const approvalPlaces: ApprovalPlace[] = a.approvalPlaces || [];
  const stagePlace = approvalPlaces.find(p => p.scope === 'STAGE' && p.stageCode === selectedStage?.stage);
  const groupPlace = approvalPlaces.find(p => p.scope === 'GROUP' && p.groupCode && p.groupCode === selectedStage?.groupCode);

  const groupedLevels = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const lv of stagePlace?.levels || []) {
      const list = map.get(lv.levelNo) || [];
      if (lv.authorityName && !list.includes(lv.authorityName)) list.push(lv.authorityName);
      map.set(lv.levelNo, list);
    }
    return [...map.entries()].sort((x, y) => x[0] - y[0]);
  }, [stagePlace]);

  const approval = a.approval || {current: []};
  const rejected = (approval.current || []).filter((c: any) => c.state === 'REJECTED');
  const reopenedByStage = new Map<string, {forms: string[]; documents: string[]; deeds: string[]}>();
  for (const r of approval.current || []) {
    if (r.scope !== 'STAGE' || !r.reopened) continue;
    reopenedByStage.set(r.stageCode, r.reopened);
  }

  const openPlace = (target: string) => {
    const place = GAP_PLACE[target];
    if (!place) return;
    if (place.stage) setActiveStage(place.stage);
    setTab(place.tab);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const switchToStage = (st: StageProgressItem) => {
    setSelectedStageCode(st.stage);
    const wf = workflowStages.find(w => w.code === st.stage);
    if (wf) setActiveStage(screenOf(wf));
  };

  const stageLabel = selectedStage?.name || 'Stage';
  const isDone = !!selectedStage?.completed;
  const isSubmitted = !!selectedStage?.submitted && !isDone;
  const isBlocked = !!selectedStage && !selectedStage.canSubmit && !isSubmitted && !isDone;
  const isReady = !!selectedStage && selectedStage.canSubmit && !isSubmitted && !isDone && missingCount === 0 && !checking;

  const progressPct = isDone || isSubmitted || isReady ? 100 : Math.max(12, Math.min(88, 100 - missingCount * 5));
  const progressTone = isDone || isReady ? 'green' : isSubmitted ? 'blue' : 'amber';

  const formSummaryLabel =
    selectedScreen === SCREEN.PRE_ANALYSIS
      ? 'Pre Analysis form'
      : selectedScreen === SCREEN.FAP
        ? 'FAP form'
        : `${stageLabel} form`;

  const otherStages = stages.filter(st => st.stage !== selectedStage?.stage);

  return (
    <section className="panel" style={{background: 'transparent', border: 'none', padding: 0, boxShadow: 'none'}}>
      {rejected.map((r: any) => (
        <div key={r.id} className="ap-rejected" style={{marginBottom: 16}}>
          <AlertTriangle size={18} />
          <div>
            <b>{r.name} was rejected</b> — fix it and submit again.
            {r.decision?.remarks && <p>{r.decision.remarks}</p>}
            {(() => {
              const items = reopenedByStage.get(r.stageCode);
              if (!items) return null;
              if (!items.forms.length && !items.documents.length && !items.deeds.length) return null;
              return (
                <div className="ap-reopened">
                  <small>Opened again for revision:</small>
                  <ul>
                    {items.forms.map(name => (
                      <li key={'f-' + name}>{name}</li>
                    ))}
                    {items.documents.map(name => (
                      <li key={'d-' + name}>Document · {name}</li>
                    ))}
                    {items.deeds.map(name => (
                      <li key={'e-' + name}>Legal deed · {name}</li>
                    ))}
                  </ul>
                </div>
              );
            })()}
            <small>
              {r.decision?.by} · {r.decision?.decidedAt ? date(r.decision.decidedAt) : ''}
              {r.decision?.via === 'LARK' ? ' · from Lark' : ''}
            </small>
          </div>
        </div>
      ))}

      <div className="sub-layout">
        {/* Left Main Card */}
        <div className="sub-card">
          <div className="sub-card-head">
            <div className="sub-card-title-row">
              <div>
                <h2 className="sub-card-title">Submit {stageLabel}</h2>
                <p className="sub-card-subtitle">
                  {isDone
                    ? `${stageLabel} has been approved.`
                    : isSubmitted
                      ? `${stageLabel} is locked and currently waiting for approval.`
                      : isBlocked
                        ? selectedStage?.blockedReason || `Complete the prerequisite stage before submitting ${stageLabel}.`
                        : missingCount > 0
                          ? `Finish these items, then send ${stageLabel} for approval. The stage is locked while it is being reviewed.`
                          : `Everything needed is complete. Send ${stageLabel} for approval.`}
                </p>
              </div>
              {isDone ? (
                <span className="sub-pill green">Approved</span>
              ) : isSubmitted ? (
                <span className="sub-pill blue">In review</span>
              ) : isBlocked ? (
                <span className="sub-pill muted">Locked</span>
              ) : missingCount > 0 ? (
                <span className="sub-pill amber">{missingCount} items left</span>
              ) : (
                <span className="sub-pill green">Ready</span>
              )}
            </div>
            <div className="sub-progress-track">
              <div className={`sub-progress-fill ${progressTone}`} style={{width: `${progressPct}%`}} />
            </div>
          </div>

          <div className="sub-card-body">
            {isBlocked ? (
              <div className="sub-item-row">
                <span className="sub-item-left">
                  <Clock size={16} color="#64748b" />
                  <span className="sub-item-title">{selectedStage?.blockedReason || 'Waiting for prerequisite stage'}</span>
                </span>
              </div>
            ) : missingCount > 0 ? (
              groupedGaps.map(([target, items]) => {
                const place = GAP_PLACE[target];
                const isDoc = target === 'DOCUMENTS';
                const expanded = !!expandedTargets[target];
                const visibleItems = isDoc || expanded ? items : items.slice(0, FIELD_LIMIT);
                const hiddenCount = items.length - visibleItems.length;

                return (
                  <div key={target} className="sub-group">
                    <div className="sub-group-head">
                      <span className="sub-group-label">
                        {TARGET_LABEL[target] || target.replace(/_/g, ' ')} · {items.length}
                      </span>
                      {place && (
                        <button type="button" className="sub-link-btn" onClick={() => openPlace(target)}>
                          Open {place.name} <ArrowRight size={13} />
                        </button>
                      )}
                    </div>

                    {isDoc ? (
                      <div className="sub-ready-list">
                        {items.map((g, idx) => (
                          <div key={`${target}-${idx}`} className="sub-item-row">
                            <span className="sub-item-left">
                              <Circle size={15} color="#cbd5e1" />
                              <span className="sub-item-title">{g.label}</span>
                            </span>
                            <span className="sub-item-detail">{g.detail || 'Not uploaded'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="sub-fields-box">
                        <div className="sub-fields-grid">
                          {visibleItems.map((g, idx) => (
                            <div key={`${target}-${idx}`} className="sub-item-row">
                              <span className="sub-item-left">
                                <Circle size={15} color="#cbd5e1" />
                                <span className="sub-item-title" title={g.detail || g.label}>
                                  {g.label}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                        {items.length > FIELD_LIMIT && (
                          <div className="sub-fields-more">
                            <span>
                              {expanded ? `Showing all ${items.length} fields` : `+ ${hiddenCount} more fields`}
                            </span>
                            <button
                              type="button"
                              className="sub-link-btn"
                              onClick={() => setExpandedTargets(prev => ({...prev, [target]: !expanded}))}
                            >
                              {expanded ? 'Show less' : 'Show all'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="sub-ready-list">
                <div className="sub-ready-row">
                  <span className="sub-check-circle">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>{formSummaryLabel}</span>
                </div>
                {(selectedScreen === SCREEN.PRE_ANALYSIS || selectedScreen === SCREEN.FAP) && (
                  <div className="sub-ready-row">
                    <span className="sub-check-circle">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span>Financial statements</span>
                  </div>
                )}
                <div className="sub-ready-row">
                  <span className="sub-check-circle">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>Documents</span>
                </div>
              </div>
            )}
          </div>

          <div className="sub-card-footer">
            {isDone ? (
              <span className="sub-footer-hint">Stage approved</span>
            ) : isSubmitted ? (
              <span className="sub-footer-hint">Waiting for approval review</span>
            ) : isBlocked ? (
              <span className="sub-footer-hint">{selectedStage?.blockedReason || 'Not ready to submit yet'}</span>
            ) : (
              <>
                {missingCount > 0 && (
                  <span className="sub-footer-hint">Complete {missingCount} items to submit</span>
                )}
                <button
                  type="button"
                  className="sub-submit-btn"
                  disabled={!canSubmitRole || checking || missingCount > 0 || !selectedStage}
                  onClick={() => selectedStage && setSubmitStageCode(selectedStage.stage)}
                >
                  Submit {stageLabel}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="sub-sidebar">
          <div className="sub-side-card">
            <h3 className="sub-side-title">After you submit</h3>
            {groupedLevels.length > 0 || groupPlace ? (
              <div className="sub-stepper">
                {groupedLevels.map(([levelNo, roles]) => (
                  <div key={levelNo} className="sub-step">
                    <span className="sub-step-badge">{levelNo}</span>
                    <div className="sub-step-body">
                      <span className="sub-step-level">Level {levelNo}</span>
                      <span className="sub-step-role">{roles.join(' & ') || 'Approver'}</span>
                      <span className="sub-step-meta">
                        {roles.length <= 1 ? '1 approver' : `${roles.length} approvers · all must approve`}
                      </span>
                    </div>
                  </div>
                ))}
                {groupPlace && (
                  <div className="sub-step">
                    <span className="sub-step-badge">→</span>
                    <div className="sub-step-body">
                      <span className="sub-step-level">Then</span>
                      <span className="sub-step-role">
                        {groupPlace.approvalName || `${selectedStage?.group || 'Group'} approval`}
                      </span>
                      <span className="sub-step-meta">Starts when all stages in group are approved</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="sub-card-subtitle" style={{margin: 0}}>
                No stage approval levels configured.
              </p>
            )}
            <p className="sub-side-note">If something is rejected, the stage opens again for revision.</p>
          </div>

          {otherStages.length > 0 && (
            <div className="sub-side-card">
              <h3 className="sub-side-title">Other stages</h3>
              <div className="sub-other-list">
                {otherStages.map(st => {
                  const stMissing = missingByStage[st.stage]?.length ?? 0;
                  return (
                    <div key={st.stage} className="sub-other-row">
                      <div className="sub-other-left">
                        {st.completed ? (
                          <CheckCircle2 size={15} color="#16a34a" style={{marginTop: 2, flexShrink: 0}} />
                        ) : st.submitted ? (
                          <Clock size={15} color="#2563eb" style={{marginTop: 2, flexShrink: 0}} />
                        ) : st.canSubmit ? (
                          <Circle size={15} color="#0f2942" style={{marginTop: 2, flexShrink: 0}} />
                        ) : (
                          <Circle size={15} color="#cbd5e1" style={{marginTop: 2, flexShrink: 0}} />
                        )}
                        <div>
                          <div className="sub-other-name">{st.name}</div>
                          <div className={`sub-other-sub ${st.canSubmit && !st.submitted && !st.completed && stMissing > 0 ? 'warn' : ''}`}>
                            {st.completed
                              ? 'Approved'
                              : st.submitted
                                ? 'In review'
                                : st.canSubmit
                                  ? stMissing > 0
                                    ? `${stMissing} items left`
                                    : 'Ready to submit'
                                  : st.blockedReason || 'Waiting for previous stage'}
                          </div>
                        </div>
                      </div>
                      <button type="button" className="sub-link-btn" onClick={() => switchToStage(st)}>
                        Open <ArrowRight size={12} />
                      </button>
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
