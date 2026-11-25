/** What the submitter view and the approver view share: the types of an approval, the layers of a step list and the list of what has to be approved. */
import {Check, ChevronDown, Clock, ExternalLink, Eye, History, Lock, RotateCcw, X} from 'lucide-react';
import {createPreviewState, useOpenView} from './ApprovalSummary';
import {useWorkspace} from './WorkspaceContext';
import type {PreviewState} from '@/features/documents/lib/checklist/types';

/** What a step shows: a step the group's rejection opened again is REJECTED in the database, but nobody rejected it. */
export const shownStatus = (s: Step) => (s.reopened ? 'REOPENED' : s.status);
export const STEP_LABEL: Record<string, string> = {WAITING: 'Waiting its turn', PENDING: 'Needs approval', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Closed', REOPENED: 'Opened again'};

export type Step = {id: string; name: string; status: string; reopened?: boolean; startedAt?: string | null; sortOrder: number; authorityName: string; canAct: boolean; decisions: {by: string; decision: string; remarks: string | null; decidedAt: string; via: string}[]};
export type Scope = {scope: string; scopeName: string; roundNo: number; sectionCode?: string | null; subjectId?: string | null; checklistId?: string | null; stageCode?: string | null; groupCode?: string | null; documentCode?: string | null; /** Things below (deeds, documents, stages) that are not approved yet: until then the approvers do not see this one. */ locked?: boolean; lockedBy?: number; steps: Step[]};
export type Approval = {state: string; stateName: string; current: Scope[]; history: Scope[]};

/** The steps of a thing as layers: steps with the same order are one layer (all asked at the same time), the next layer starts when the one before is approved. */
export function layersOf(steps: Step[]): Step[][] {
  const layers: Step[][] = [];
  for (const st of [...steps].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const last = layers[layers.length - 1];
    if (last && last[0].sortOrder === st.sortOrder) last.push(st);
    else layers.push([st]);
  }
  return layers;
}

const when = (v?: string | null) => (v ? new Date(v).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'}) : '');

type LayerState = 'done' | 'now' | 'next' | 'rejected' | 'reopened' | 'closed';

const layerState = (l: Step[]): LayerState =>
  l.some(s => shownStatus(s) === 'REJECTED') ? 'rejected' : l.some(s => s.reopened) ? 'reopened' : l.every(s => s.status === 'APPROVED') ? 'done' : l.some(s => s.status === 'PENDING') ? 'now' : l.every(s => s.status === 'CANCELLED') ? 'closed' : 'next';

/** Who approves a step, from the authority name ("CRM_FAP-FORM_BS_APPROVE" reads "FAP-FORM BS"); a step with no authority is the PIC Marketing level. */
export const whoOf = (s: Step) => (s.authorityName ? s.authorityName.replace(/^CRM_/i, '').replace(/_?(APPROVE|APPROVAL|APPROVER)$/i, '').replace(/_/g, ' ') : 'PIC Marketing');

/** What a step says about itself, in plain words: the person who can decide sees "Your turn". */
const stepLabel = (s: Step) => (s.status === 'PENDING' ? (s.canAct ? 'Your turn' : 'In review') : s.status === 'WAITING' ? 'Up next' : (STEP_LABEL[shownStatus(s)] ?? s.status));

const Decisions = ({step}: {step: Step}) => (
  <>
    {step.decisions.map((d, i) => (
      <div key={i} className="ap-decision" style={{marginTop: 4}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
          {d.decision === 'APPROVED' ? <Check size={14} /> : <X size={14} />} {d.by}: {d.decision === 'APPROVED' ? 'approved' : 'rejected'}
          {d.decidedAt ? ` · ${when(d.decidedAt)}` : ''}
          {d.via === 'LARK' ? ' (from Lark)' : ''}
        </div>
        {d.remarks ? (
          <div
            className="ap-decision-remarks"
            style={{paddingLeft: 20, color: '#475569', fontSize: '0.9em', marginTop: 2}}
            dangerouslySetInnerHTML={{__html: d.remarks}}
          />
        ) : null}
      </div>
    ))}
  </>
);

/** The order of the scopes follows the workflow: the groups in order, inside a group its stages in order (a stage, then its deeds and documents), the approval of the group itself last. */
function rankOf(c: Scope, stages: any[], groups: any[]): [number, number, number] {
  const stage = stages.find(s => s.code === (c.stageCode || ''));
  const groupCode = c.groupCode || stage?.groupCode || '';
  const g = groups.findIndex(x => x.code === groupCode);
  const groupRank = g < 0 ? 999 : g;
  if (c.scope === 'GROUP') return [groupRank, 9999, 0];
  const stageRank = stage ? stage.order * 10 + stages.indexOf(stage) / 100 : 9000;
  return [groupRank, stageRank, c.scope === 'STAGE' ? 0 : c.scope === 'SECTION' ? 1 : 2];
}

const KIND: Record<string, string> = {GROUP: 'Group', STAGE: 'Stage', SECTION: 'Deed', DOCUMENT: 'Document'};
  
/** One line for the whole scope: where it stands, from its steps. */
function scopeSummary(c: Scope): {tone: string; text: string} {
  const st = c.steps;
  if (st.some(s => shownStatus(s) === 'REJECTED')) return {tone: 'rejected', text: 'Rejected'};
  if (st.some(s => s.reopened)) return {tone: 'reopened', text: 'Opened again'};
  if (st.every(s => s.status === 'APPROVED')) return {tone: 'approved', text: 'Approved'};
  if (c.locked) return {tone: 'locked', text: 'Waiting for what is below'};
  if (st.some(s => s.status === 'PENDING')) return {tone: 'pending', text: 'Needs approval'};
  return {tone: 'waiting', text: 'Waiting'};
}

/** Everything that has to be approved, in workflow order. Each thing has a button to the screen it is about; with onDecide the steps the person may decide show Approve and Reject. */
export function ScopeList({
  scopes,
  onDecide,
  onPreview,
}: {
  scopes: Scope[];
  onDecide?: (step: Step, kind: 'APPROVED' | 'REJECTED') => void;
  onPreview?: (state: PreviewState) => void;
}) {
  const {a} = useWorkspace();
  const openView = useOpenView();
  const docs: any[] = a?.documentChecks || [];
  const stages: any[] = a.workflow?.stages || [];
  const groups: any[] = a.workflow?.groups || [];
  const ordered = [...scopes].sort((x, y) => {
    const rx = rankOf(x, stages, groups);
    const ry = rankOf(y, stages, groups);
    return rx[0] - ry[0] || rx[1] - ry[1] || rx[2] - ry[2] || x.scopeName.localeCompare(y.scopeName);
  });
  return (
    <>
      {ordered.map(c => {
        const isDocScope = c.scope === 'DOCUMENT';
        const docForScope = isDocScope
          ? docs.find(
              (x: any) =>
                x.id === c.checklistId ||
                (x.documentCode && c.documentCode && x.documentCode === c.documentCode),
            )
          : null;
        const canDecideScope = !isDocScope || Boolean(docForScope && docForScope.files && docForScope.files.length > 0);
        const view = openView(c);
        const approvalName = c.steps[0]?.name.split(' · level')[0] ?? '';
        return (
          <div className={`ap-scope compact kind-${c.scope.toLowerCase()}${c.locked ? ' locked' : ''}`} key={`${c.scope}-${c.scopeName}`}>
            <div className="ap-scope-title">
              <span className="ap-kind">{KIND[c.scope] ?? c.scope}</span>
              <b>{c.scopeName.replace(/^(Group|Stage|Document)\s+/, '').replace(/^Section\s+/, '')}</b>
              {c.roundNo > 1 && <small>Round {c.roundNo}</small>}
              <span className={'ap-pill ' + scopeSummary(c).tone}>{scopeSummary(c).text}</span>
              {view && (
                <button type="button" className="ap-view" onClick={view.go} title="Open the screen this approval is about">
                  <ExternalLink size={13} /> {view.label}
                </button>
              )}
            </div>
            {approvalName && <small className="ap-scope-sub">{approvalName}</small>}
            {(() => {
              const layers = layersOf(c.steps);
              const done = layers.filter(l => l.every(s => s.status === 'APPROVED')).length;
              return (
                <div className="ap-progress" title={`${done} of ${layers.length} levels approved`}>
                  <span style={{width: `${(done / Math.max(layers.length, 1)) * 100}%`}} />
                </div>
              );
            })()}
            {c.locked && !c.steps.every(s => s.status === 'APPROVED') && (
              <p className="ap-locknote">
                <Lock size={13} /> {c.lockedBy} item(s) below must be approved first. Approvers see this step after that; submitting is not blocked.
              </p>
            )}
            <ol className="ap-tl" aria-label="Approval levels">
              {layersOf(c.steps).map((layer, li) => {
                const state = layerState(layer);
                return (
                  <li key={li} className={state}>
                    <span className="ap-tl-dot" aria-hidden>
                      {state === 'done' ? <Check size={16} /> : state === 'now' ? <Clock size={16} /> : state === 'rejected' ? <X size={16} /> : state === 'reopened' ? <RotateCcw size={16} /> : li + 1}
                    </span>
                    <div className="ap-tl-body">
                      <div className="ap-tl-level">
                        <b>Level {li + 1}</b>
                        {layer.length > 1 && <small>{layer.length} approvers, all must approve</small>}
                        {state === 'next' && <small>starts after level {li} is approved</small>}
                      </div>
                      {layer.map(s => (
                        <div key={s.id} className={'ap-tl-step ' + shownStatus(s).toLowerCase()}>
                          <div className="ap-tl-row">
                            <span className="ap-tl-who">{whoOf(s)}</span>
                            <span className={'ap-pill ' + shownStatus(s).toLowerCase() + (s.status === 'PENDING' && s.canAct ? ' mine' : '')}>{stepLabel(s)}</span>
                            {onDecide && s.canAct && canDecideScope && (
                              <span className="ap-actions">
                                {isDocScope && docForScope && docForScope.files && docForScope.files.length > 0 && onPreview && (
                                  <button
                                    type="button"
                                    className="button small ap-btn-view-doc"
                                    onClick={() => {
                                      const ps = createPreviewState(docForScope);
                                      if (ps) onPreview(ps);
                                    }}
                                    title={`View ${docForScope.documentName || 'Document'}`}
                                  >
                                    <Eye size={13} /> View Document
                                  </button>
                                )}
                                <button type="button" className="button primary small" onClick={() => onDecide(s, 'APPROVED')}>
                                  <Check size={13} /> Approve
                                </button>
                                <button type="button" className="button small ap-reject" onClick={() => onDecide(s, 'REJECTED')}>
                                  <X size={13} /> Reject
                                </button>
                              </span>
                            )}
                          </div>
                          <Decisions step={s} />
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </>
  );
}

/** The earlier rounds (after a reject the stage starts again with a new round). */
/** A step that was approved and then marked rejected because its group was rejected and opened it again (no reject decision of its own). */
export const reopenedStep = (s: Step) => !!s.reopened;

/** What a step that was opened again because of its group says in place of a reason of its own. */
export const fromGroupText = (d: {remarks: string | null} | null) => {
  if (!d?.remarks) return 'Rejected dari Group.';
  const plain = d.remarks.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
  return `Rejected dari Group.${plain ? ` Remarks: ${plain}` : ''}`;
};

/** The steps of one earlier round; a step opened again says why (the reason of the group rejection that opened it). */
function RoundSteps({c, note}: {c: Scope; note: string | null}) {
  return (
    <ol>
      {c.steps.map(s => (
        <li key={s.id} className={'ap-step ' + shownStatus(s).toLowerCase()}>
          <div className="ap-step-top">
            <b>{s.name}</b>
            <span className={'ap-pill ' + shownStatus(s).toLowerCase()}>{STEP_LABEL[shownStatus(s)] ?? s.status}</span>
          </div>
          <Decisions step={s} />
          {reopenedStep(s) && note !== null && (
            <p className="ap-decision">
              <X size={14} /> {note}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

const scopeKey = (c: Scope) => [c.scope, c.groupCode, c.stageCode, c.checklistId, c.sectionCode, c.subjectId].join('|');
const timeOf = (v?: string | null) => (v ? new Date(v).getTime() : NaN);
const plainName = (c: Scope) =>
  c.scope === 'STAGE' ? c.scopeName.replace(/^Stage\s+/, '') : c.scope === 'DOCUMENT' ? c.scopeName.replace(/^Document\s+/, '') : c.scopeName.replace(/^.*·\s*/, '');

/**
 * The earlier rounds, one block per rejection of the group (each is a round of the whole group), with what that rejection opened again: the stage
 * first, then its documents and deeds. What a rejection opened is found from the times alone: an item that was opened again belongs to the LAST
 * rejection of the group between its last approval and the start of its next round (a group can only be rejected when every stage is done, so no
 * other rejection can fall between the moment an item is opened again and the moment it is submitted again). What was rejected on its own (not by
 * its group) is listed apart.
 */
export function HistoryList({history, current = []}: {history: Scope[]; current?: Scope[]}) {
  if (!history.length) return null;
  const all = [...history, ...current];
  const sameScope = new Map<string, Scope[]>();
  for (const c of all) sameScope.set(scopeKey(c), [...(sameScope.get(scopeKey(c)) || []), c]);
  const episodes = all
    .filter(c => c.scope === 'GROUP' || c.scope === 'STAGE')
    .flatMap(g =>
      g.steps.flatMap(s => {
        const d = s.decisions.find(x => x.decision === 'REJECTED');
        // a stage rejected on its own is an episode too: the stage itself and the documents / deeds the approver opened with it
        return s.status === 'REJECTED' && d ? [{group: g, decision: d, t: timeOf(d.decidedAt), items: g.scope === 'STAGE' ? [g] : ([] as Scope[])}] : [];
      }),
    )
    .sort((x, y) => x.t - y.t);
  const own: Scope[] = [];
  // what a rejection opened and is not submitted again yet is still the current round of its place: it belongs to its rejection too
  const opened = current.filter(c => c.scope !== 'GROUP' && c.steps.some(s => s.reopened));
  for (const c of [...history, ...opened]) {
    if (c.scope === 'GROUP') continue;
    if (c.scope === 'STAGE' && episodes.some(e => e.group === c)) continue; // already in its own episode
    if (!c.steps.some(s => s.reopened)) {
      own.push(c);
      continue;
    }
    const lastApproval = Math.max(...c.steps.flatMap(s => s.decisions.map(d => timeOf(d.decidedAt))).filter(n => !Number.isNaN(n)));
    const next = (sameScope.get(scopeKey(c)) || []).find(x => x.roundNo === c.roundNo + 1);
    const nextStart = next ? Math.min(...next.steps.map(s => timeOf(s.startedAt)).filter(n => !Number.isNaN(n))) : Infinity;
    const episode = episodes.filter(e => e.t > lastApproval && e.t < nextStart).pop();
    if (episode) episode.items.push(c);
    else own.push(c);
  }
  const ownRejected = own.filter(c => c.steps.some(s => s.status === 'REJECTED' && !s.reopened)).length;
  const rejected = episodes.length + ownRejected;
  return (
    <details className={'ap-history ap-fold' + (rejected ? ' has-rejected' : '')}>
      <summary>
        <ChevronDown size={16} className="ap-chev" />
        <History size={15} /> Earlier rounds ({episodes.length})
        {rejected > 0 && <span className="ap-history-flag">{rejected} rejected</span>}
        <span className="ap-fold-hint">
          <span className="when-closed">View all</span>
          <span className="when-open">Hide</span>
        </span>
      </summary>
      {[...episodes].reverse().map(e => {
        const stages = new Map<string, {name: string; stage?: Scope; documents: Scope[]; deeds: Scope[]}>();
        for (const c of e.items) {
          const code = c.stageCode || '';
          const entry = stages.get(code) || {name: code, documents: [], deeds: []};
          if (c.scope === 'STAGE') Object.assign(entry, {stage: c, name: plainName(c)});
          else if (c.scope === 'DOCUMENT') entry.documents.push(c);
          else entry.deeds.push(c);
          stages.set(code, entry);
        }
        const cleanRemarks = e.decision.remarks?.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
        const note = e.group.scope === 'STAGE' ? `Rejected dari Stage.${cleanRemarks ? ` Remarks: ${cleanRemarks}` : ''}` : fromGroupText(e.decision);
        return (
          <details key={e.group.roundNo + '-' + e.decision.decidedAt} className="ap-episode">
            <summary>
              <b>Round {e.group.roundNo}</b> · {e.group.scopeName} rejected by {e.decision.by} · <small>{when(e.decision.decidedAt)}</small>
              {cleanRemarks && <span className="ap-episode-why">{cleanRemarks}</span>}
            </summary>
            {stages.size === 0 && <p className="muted">Nothing was opened again by this rejection.</p>}
            {[...stages.entries()].map(([code, st]) => (
              <div key={code} className="ap-episode-stage">
                <p>
                  <b>Stage opened again: {st.name}</b>
                </p>
                {st.stage && (
                  <details className="ap-episode-item">
                    <summary>Stage approval · round {st.stage.roundNo}</summary>
                    <RoundSteps c={st.stage} note={note} />
                  </details>
                )}
                {[...st.documents, ...st.deeds].map(c => (
                  <details key={scopeKey(c) + c.roundNo} className="ap-episode-item">
                    <summary>
                      {c.scope === 'DOCUMENT' ? 'Document' : 'Legal deed'} · {plainName(c)} <small>round {c.roundNo}</small>
                    </summary>
                    <RoundSteps c={c} note={note} />
                  </details>
                ))}
              </div>
            ))}
          </details>
        );
      })}
      {own.length > 0 && (
        <details className="ap-episode">
          <summary>
            <b>Rejected on their own</b> <small>({own.length})</small>
          </summary>
          {own.map(c => (
            <div key={`${scopeKey(c)}-${c.roundNo}`} className="ap-scope old">
              <div className="ap-scope-title">
                <b>{c.scopeName}</b>
                <small>Round {c.roundNo}</small>
              </div>
              <RoundSteps c={c} note={null} />
            </div>
          ))}
        </details>
      )}
    </details>
  );
}
