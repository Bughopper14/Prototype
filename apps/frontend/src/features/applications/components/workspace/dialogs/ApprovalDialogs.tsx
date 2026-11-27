/**
 * Redesign 1 approval dialogs:
 * 1) ApprovalDecisionDialog — Reject modal (with Reason chips, affected items checkboxes, Note for Marketing) & Approve confirmation.
 * 2) SubmitStageDialog — Clean confirmation modal with "What happens next" bullet card and optional note to approvers.
 */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {layersOf, whoOf} from '@/features/applications/components/workspace/approval-shared';
import {ChecklistCustomizeDialog} from '@/features/documents/components/checklist/ChecklistCustomizeDialog';
import {api} from '@/shared/lib/api';
import {hasAuthority} from '@/shared/lib/auth';
import {SCREEN} from '@/shared/master-data';
import {ArrowRight, Check, FilePlus2, Loader2, X} from 'lucide-react';
import {useEffect, useState} from 'react';

type Gap = {target: string; label: string; detail?: string};

const REJECT_REASONS = [
  'Data does not match',
  'Document missing / invalid',
  'Unreadable / blurry',
  'Customer not eligible',
  'Other',
];

const GAP_PLACE: Record<string, {stage?: string; tab: number; name: string}> = {
  FAP_FORM: {stage: SCREEN.FAP, tab: 0, name: 'FAP Form'},
  PRE_ANALYSIS: {stage: SCREEN.PRE_ANALYSIS, tab: 8, name: 'Pre-analysis form'},
  LEGAL: {stage: SCREEN.FAP, tab: 5, name: 'Legal'},
  STAKEHOLDERS: {stage: SCREEN.FAP, tab: 1, name: 'Stakeholders'},
  DOCUMENTS: {tab: 9, name: 'Document Checklist'},
};

function formatStageTitle(name: string): string {
  const clean = (name || 'Stage').trim();
  return /\bstage\b/i.test(clean) ? clean : `${clean} Stage`;
}

function GapList({gaps, onOpen}: {gaps: Gap[]; onOpen: (gap: Gap) => void}) {
  return (
    <div
      style={{
        maxHeight: 220,
        overflowY: 'auto',
        padding: '12px 14px',
        borderRadius: 10,
        background: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#991b1b',
        fontSize: 12.5,
      }}
    >
      <strong>Requirements incomplete ({gaps.length}), please complete first:</strong>
      {Object.entries(GAP_PLACE).map(([target, place]) => {
        const items = gaps.filter(gap => gap.target === target);
        if (!items.length) return null;
        return (
          <div key={target} style={{marginTop: 10}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
              <strong>
                {place.name} ({items.length})
              </strong>
              <button type="button" className="r1-link-btn" onClick={() => onOpen(items[0])}>
                Open {place.name} <ArrowRight size={13} />
              </button>
            </div>
            <ul style={{margin: '4px 0 0', paddingLeft: 18}}>
              {items.map((gap, i) => (
                <li key={i}>
                  {gap.label}
                  {gap.detail && (
                    <span style={{color: '#64748b'}}>
                      {' '}
                      · {gap.detail === 'Belum disetujui' ? "Haven't approved yet" : gap.detail}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function ApprovalDecisionDialog() {
  const {a, user, onChange, notify, busy, setBusy, error, setError, decision, setDecision, comments, setComments, setActiveStage, setTab} = useWorkspace();
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [kind, setKind] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [requesting, setRequesting] = useState(false);

  const activeRound = (a.approval?.current || []).find((c: any) => c.steps.some((s: any) => s.id === decision?.stepId));
  const groupRound = activeRound?.scope === 'GROUP' ? activeRound : null;
  const stageRound = activeRound?.scope === 'STAGE' ? activeRound : null;

  const groupStages: any[] = groupRound ? (a.stageProgress || []).filter((s: any) => s.groupCode === groupRound.groupCode) : [];
  const [reopen, setReopen] = useState<string[]>([]);
  const [keep, setKeep] = useState<string[]>([]);
  const [also, setAlso] = useState<string[]>([]);

  const itemsOf = (stageCode: string) =>
    (a.approval?.current || [])
      .filter((c: any) => (c.scope === 'DOCUMENT' || c.scope === 'SECTION') && c.stageCode === stageCode && c.steps.length > 0 && c.steps.every((st: any) => st.status === 'APPROVED'))
      .map((c: any) => ({
        kind: c.scope === 'DOCUMENT' ? 'document' : 'deed',
        id: (c.scope === 'DOCUMENT' ? c.checklistId : c.subjectId) as string,
        name: c.scope === 'DOCUMENT' ? String(c.scopeName).replace(/^Document\s+/, '') : String(c.scopeName).replace(/^.*·\s*/, ''),
      }))
      .filter((i: any) => i.id);

  const stageItems = stageRound ? itemsOf(stageRound.stageCode) : [];

  useEffect(() => {
    if (decision) {
      setKind(decision.kind);
      setComments('');
      setSelectedReasons([]);
    }
    setKeep([]);
    setAlso([]);
    setReopen(groupStages.map((s: any) => s.stage));
  }, [decision?.stepId, decision?.kind]);

  if (!decision) return null;

  const reject = kind === 'REJECTED';
  const pickStages = reject && groupStages.length > 0;
  const canRequestDocuments = hasAuthority(user, 'CRM_DOCUMENT_UPLOAD');
  const requested = (a.documentChecks || []).filter((d: any) => d.source === 'ADDED');

  const close = () => {
    setGaps([]);
    setError('');
    setDecision(null);
    setComments('');
    setSelectedReasons([]);
  };

  const openGap = (gap: Gap) => {
    const place = GAP_PLACE[gap.target];
    if (!place) return;
    close();
    if (place.stage) setActiveStage(place.stage);
    setTab(place.tab);
  };

  const toggleReason = (reason: string) => {
    setSelectedReasons(prev => (prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]));
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    setGaps([]);
    try {
      const noteText = (comments || '').trim();
      const reasonPrefix = reject && selectedReasons.length > 0 ? `[${selectedReasons.join(', ')}]` : '';
      const combined = [reasonPrefix, noteText].filter(Boolean).join(' ');
      const remarks = combined || undefined;
      const kept = pickStages ? groupStages.filter(s => reopen.includes(s.stage)).flatMap(s => itemsOf(s.stage)).filter((i: any) => keep.includes(i.id)) : [];

      onChange(
        await api(`/applications/${a.id}/approvals/${decision.stepId}/decision`, 'POST', {
          decision: kind,
          remarks,
          ...(pickStages
            ? {
                reopenStages: reopen,
                keepApproved: {
                  documents: kept.filter((i: any) => i.kind === 'document').map((i: any) => i.id),
                  deeds: kept.filter((i: any) => i.kind === 'deed').map((i: any) => i.id),
                },
              }
            : {}),
          ...(reject && stageItems.length > 0 && also.length > 0
            ? {
                reopenItems: {
                  documents: stageItems.filter((i: any) => i.kind === 'document' && also.includes(i.id)).map((i: any) => i.id),
                  deeds: stageItems.filter((i: any) => i.kind === 'deed' && also.includes(i.id)).map((i: any) => i.id),
                },
              }
            : {}),
        }),
      );
      setDecision(null);
      setComments('');
      setSelectedReasons([]);
      notify(reject ? 'Rejected. Returned for revision.' : 'Approved');
    } catch (e: any) {
      setError(e.message);
      setGaps(Array.isArray(e.missing) ? e.missing : []);
    } finally {
      setBusy(false);
    }
  };

  const scopeLabel = activeRound?.scope === 'STAGE'
    ? String(activeRound.scopeName || 'stage').replace(/^Stage\s+/i, '')
    : activeRound?.scope === 'GROUP'
      ? String(activeRound.scopeName || 'group')
      : String(activeRound?.scopeName || decision.step || 'item').replace(/^(Document|Section)\s+/i, '');

  const roundNo = activeRound?.roundNo || 1;
  const picLabel = a.picName || a.createdByName || 'Marketing';
  const stageLabelClean = /\bstage\b/i.test(scopeLabel) ? scopeLabel : `${scopeLabel} stage`;
  const modalTitle = reject
    ? activeRound?.scope === 'STAGE'
      ? `Reject the ${stageLabelClean}?`
      : `Reject ${scopeLabel}?`
    : activeRound?.scope === 'STAGE'
      ? `Approve the ${stageLabelClean}?`
      : `Approve ${scopeLabel}?`;

  const modalSubtitle = reject
    ? `${a.customer?.companyName || 'Application'} · Round ${roundNo} · goes back to Marketing (${picLabel})`
    : `${a.customer?.companyName || 'Application'} · ${a.applicationNumber || a.id} · Round ${roundNo}`;

  const canConfirm = !busy && (!reject || (comments || '').trim().length > 0) && (!pickStages || reopen.length > 0);

  return (
    <div className="r1-modal-backdrop" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && close()}>
      <div className="r1-modal">
        <div className="r1-modal-head">
          <div>
            <h3>{modalTitle}</h3>
            <p>{modalSubtitle}</p>
          </div>
          <button type="button" className="r1-icon-btn" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="r1-modal-body">
          {reject ? (
            <>
              {/* Reason quick-chips */}
              <div>
                <div style={{fontSize: 12.5, fontWeight: 700, color: '#0f172a'}}>Reason</div>
                <div className="r1-chips">
                  {REJECT_REASONS.map(reason => {
                    const active = selectedReasons.includes(reason);
                    return (
                      <button
                        key={reason}
                        type="button"
                        className={`r1-chip${active ? ' active' : ''}`}
                        onClick={() => toggleReason(reason)}
                      >
                        {reason}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Affected items (Group rejection) */}
              {pickStages && (
                <div>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6}}>
                    <span style={{fontSize: 12.5, fontWeight: 700, color: '#0f172a'}}>Which stages are affected?</span>
                    <button
                      type="button"
                      className="r1-link-btn"
                      style={{fontSize: 11.5}}
                      onClick={() => setReopen(reopen.length === groupStages.length ? [] : groupStages.map((s: any) => s.stage))}
                    >
                      {reopen.length === groupStages.length ? 'Clear all' : 'Select all'}
                    </button>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                    {groupStages.map((s: any) => {
                      const on = reopen.includes(s.stage);
                      const items = itemsOf(s.stage);
                      return (
                        <div key={s.stage} style={{display: 'flex', flexDirection: 'column', gap: 5}}>
                          <label className={`r1-check-card${on ? ' checked' : ''}`}>
                            <input
                              type="checkbox"
                              checked={on}
                              style={{accentColor: '#00285a', width: 15, height: 15}}
                              onChange={e => setReopen(r => (e.target.checked ? [...r, s.stage] : r.filter(c => c !== s.stage)))}
                            />
                            <span style={{flex: 1}}>{s.name}</span>
                            <span style={{fontSize: 11.5, fontWeight: 600, color: on ? '#dc2626' : '#64748b'}}>
                              {on ? 'Opens again' : 'Stays approved'}
                            </span>
                          </label>
                          {on && items.length > 0 && (
                            <div style={{paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 5}}>
                              {items.map((i: any) => {
                                const reopensWithStage = !keep.includes(i.id);
                                return (
                                  <label key={i.id} className={`r1-check-card${reopensWithStage ? ' checked' : ''}`} style={{padding: '8px 10px', fontSize: 12.5}}>
                                    <input
                                      type="checkbox"
                                      checked={reopensWithStage}
                                      style={{accentColor: '#00285a', width: 14, height: 14}}
                                      onChange={e => setKeep(k => (e.target.checked ? k.filter(x => x !== i.id) : [...k, i.id]))}
                                    />
                                    <span style={{flex: 1}}>
                                      {i.kind === 'document' ? 'Document' : 'Legal deed'} · {i.name}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {reopen.length === 0 && (
                      <div style={{fontSize: 12, color: '#dc2626', fontWeight: 600}}>Choose at least one stage to open again.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Affected items (Stage rejection) */}
              {stageRound && (
                <div>
                  <div style={{fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 6}}>Which items are affected?</div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                    <label className="r1-check-card checked" style={{cursor: 'default'}}>
                      <input type="checkbox" checked readOnly style={{accentColor: '#00285a', width: 15, height: 15}} />
                      <span style={{flex: 1}}>{scopeLabel} Form data</span>
                      <span style={{fontSize: 11.5, color: '#64748b', fontWeight: 500}}>Always reopens</span>
                    </label>
                    {stageItems.map((i: any) => {
                      const on = also.includes(i.id);
                      return (
                        <label key={i.id} className={`r1-check-card${on ? ' checked' : ''}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            style={{accentColor: '#00285a', width: 15, height: 15}}
                            onChange={e => setAlso(x => (e.target.checked ? [...x, i.id] : x.filter(y => y !== i.id)))}
                          />
                          <span style={{flex: 1}}>
                            {i.kind === 'deed' ? `${i.name} · Legal Deeds & Amendments` : i.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Note for Marketing */}
              <div>
                <label htmlFor="r1-reject-note" style={{display: 'block', fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 6}}>
                  Note for Marketing <span style={{color: '#dc2626'}}>*</span>
                </label>
                <textarea
                  id="r1-reject-note"
                  className="r1-textarea danger"
                  value={comments || ''}
                  onChange={e => setComments(e.target.value)}
                  placeholder="Describe what needs to be fixed before re-submitting..."
                />
                <div style={{fontSize: 11.5, color: '#64748b', marginTop: 6}}>
                  Marketing fixes the marked items and submits again as round {roundNo + 1}.
                </div>
              </div>

              {canRequestDocuments && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{fontSize: 12, color: '#475569'}}>
                    <strong style={{color: '#0f172a'}}>Is a document missing?</strong>
                    <div>Add it to the application checklist for Marketing to upload.</div>
                    {requested.length > 0 && (
                      <div style={{marginTop: 4, fontSize: 11.5, color: '#1d4ed8', fontWeight: 600}}>
                        {requested.length} additional document{requested.length === 1 ? '' : 's'} requested
                      </div>
                    )}
                  </div>
                  <button type="button" className="r1-btn-outline sm" onClick={() => setRequesting(true)}>
                    <FilePlus2 size={13} /> Request documents
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="r1-info-box">
                <div className="r1-eyebrow">WHAT HAPPENS NEXT</div>
                <ul style={{margin: '2px 0 0', paddingLeft: 18, fontSize: 13, color: '#1e293b', display: 'flex', flexDirection: 'column', gap: 5}}>
                  <li>Your approval for <strong>{scopeLabel}</strong> will be recorded immediately.</li>
                  <li>If other approvers in the same level are still pending, the workflow waits for them.</li>
                  <li>Once this level is complete, the next approval level is notified automatically.</li>
                </ul>
              </div>
              <div>
                <label htmlFor="r1-approve-note" style={{display: 'block', fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 6}}>
                  Note <span style={{fontWeight: 500, color: '#64748b'}}>(optional)</span>
                </label>
                <textarea
                  id="r1-approve-note"
                  className="r1-textarea"
                  value={comments || ''}
                  onChange={e => setComments(e.target.value)}
                  placeholder="e.g. All documents and figures verified."
                />
              </div>
            </>
          )}

          {gaps.length > 0 ? (
            <GapList gaps={gaps} onOpen={openGap} />
          ) : error ? (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          ) : null}
        </div>

        <div className="r1-modal-foot">
          <button type="button" className="r1-btn-outline" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className={reject ? 'r1-btn-reject-solid' : 'r1-btn-approve'}
            disabled={!canConfirm}
            onClick={confirm}
          >
            {busy ? <Loader2 size={14} className="spin" /> : reject ? <X size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
            {reject ? (activeRound?.scope === 'STAGE' ? 'Reject stage' : 'Reject') : 'Approve'}
          </button>
        </div>
      </div>

      {requesting && <ChecklistCustomizeDialog application={a} onChange={onChange} notify={notify} onClose={() => setRequesting(false)} />}
    </div>
  );
}

export function SubmitStageDialog() {
  const {a, onChange, notify, busy, setBusy, error, setError, submitStageCode, setSubmitStageCode, comments, setComments, setActiveStage, setTab} = useWorkspace();
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!submitStageCode) return;
    setComments('');
    let alive = true;
    setChecking(true);
    api(`/applications/${a.id}/stages/${encodeURIComponent(submitStageCode)}/check`)
      .then((r: any) => alive && setGaps(Array.isArray(r?.missing) ? r.missing : []))
      .catch(() => alive && setGaps([]))
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [submitStageCode, a.id]);

  if (!submitStageCode) return null;

  const stage = (a.stageProgress || []).find((s: any) => s.stage === submitStageCode);
  const stageTitle = formatStageTitle(stage?.name ?? 'Stage');

  const stageRound = (a.approval?.current || []).find((c: any) => c.scope === 'STAGE' && c.stageCode === submitStageCode);
  const stageLayers = stageRound?.steps?.length ? layersOf(stageRound.steps) : [];
  const levelsSummary = stageLayers.length
    ? stageLayers.map((layer, idx) => `Level ${idx + 1}: ${layer.map(whoOf).join(' & ')}`).join(' · ') + '.'
    : 'Approvers are notified according to the configured stage workflow.';

  const close = () => {
    setGaps([]);
    setError('');
    setSubmitStageCode(null);
    setComments('');
  };

  const openGap = (gap: Gap) => {
    const place = GAP_PLACE[gap.target];
    if (!place) return;
    close();
    if (place.stage) setActiveStage(place.stage);
    setTab(place.tab);
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    setGaps([]);
    try {
      const remarks = (comments || '').trim() || undefined;
      await api(`/applications/${a.id}/stages/${submitStageCode}/submit`, 'POST', {remarks});
      onChange(await api(`/applications/${a.id}`));
      setSubmitStageCode(null);
      setComments('');
      notify(`${stage?.name ?? 'Stage'} submitted for approval`);
    } catch (e: any) {
      setError(e.message);
      setGaps(Array.isArray(e.missing) ? e.missing : []);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="r1-modal-backdrop" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && close()}>
      <div className="r1-modal">
        <div className="r1-modal-head">
          <div>
            <h3>Submit {stageTitle} for approval?</h3>
            <p>
              {a.customer?.companyName || 'Application'} · {a.applicationNumber || a.id}
            </p>
          </div>
          <button type="button" className="r1-icon-btn" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="r1-modal-body">
          <div className="r1-info-box">
            <div className="r1-eyebrow">WHAT HAPPENS NEXT</div>
            <ul style={{margin: '2px 0 0', paddingLeft: 18, fontSize: 13, color: '#1e293b', display: 'flex', flexDirection: 'column', gap: 5}}>
              <li>{stageTitle} is locked — no more edits while it is reviewed.</li>
              <li>{levelsSummary}</li>
              <li>You will be notified when it is approved or returned.</li>
            </ul>
          </div>

          <div>
            <label htmlFor="r1-submit-note" style={{display: 'block', fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 6}}>
              Note to approvers <span style={{fontWeight: 500, color: '#64748b'}}>(optional)</span>
            </label>
            <textarea
              id="r1-submit-note"
              className="r1-textarea"
              value={comments || ''}
              onChange={e => setComments(e.target.value)}
              placeholder="e.g. Deed amendment will follow next week"
            />
          </div>

          {gaps.length > 0 ? (
            <GapList gaps={gaps} onOpen={openGap} />
          ) : error ? (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          ) : null}
        </div>

        <div className="r1-modal-foot">
          <button type="button" className="r1-btn-outline" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="r1-btn-navy"
            disabled={busy || checking || gaps.length > 0}
            title={gaps.length ? 'Complete the missing items first' : undefined}
            onClick={confirm}
          >
            {(busy || checking) && <Loader2 size={14} className="spin" />}
            Submit {stageTitle}
          </button>
        </div>
      </div>
    </div>
  );
}
