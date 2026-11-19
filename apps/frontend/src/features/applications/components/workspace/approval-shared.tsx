/** What the submitter view and the approver view share: the types of an approval, the layers of a step list and the list of what has to be approved. */
import {Check, ExternalLink, History, X} from 'lucide-react';
import {useOpenView} from './ApprovalSummary';
import {useWorkspace} from './WorkspaceContext';

export const STEP_LABEL: Record<string, string> = {WAITING: 'Waiting its turn', PENDING: 'Needs approval', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Closed'};

export type Step = {id: string; name: string; status: string; sortOrder: number; authorityName: string; canAct: boolean; decisions: {by: string; decision: string; remarks: string | null; decidedAt: string; via: string}[]};
export type Scope = {scope: string; scopeName: string; roundNo: number; sectionCode?: string | null; subjectId?: string | null; checklistId?: string | null; stageCode?: string | null; groupCode?: string | null; documentCode?: string | null; steps: Step[]};
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

const Decisions = ({step}: {step: Step}) => (
  <>
    {step.decisions.map((d, i) => (
      <p key={i} className="ap-decision">
        {d.decision === 'APPROVED' ? <Check size={14} /> : <X size={14} />} {d.by}: {d.decision === 'APPROVED' ? 'approved' : 'rejected'}
        {d.remarks ? ` — ${d.remarks}` : ''}
        {d.via === 'LARK' ? ' (from Lark)' : ''}
      </p>
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

/** Everything that has to be approved, in workflow order. Each thing has a button to the screen it is about; with onDecide the steps the person may decide show Approve and Reject. */
export function ScopeList({scopes, onDecide}: {scopes: Scope[]; onDecide?: (step: Step, kind: 'APPROVED' | 'REJECTED') => void}) {
  const {a} = useWorkspace();
  const openView = useOpenView();
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
        const view = openView(c);
        const approvalName = c.steps[0]?.name.split(' · level')[0] ?? '';
        return (
          <div className="ap-scope compact" key={`${c.scope}-${c.scopeName}`}>
            <div className="ap-scope-title">
              <b>{c.scopeName}</b>
              {c.roundNo > 1 && <small>Round {c.roundNo}</small>}
              {view && (
                <button type="button" className="ap-view" onClick={view.go} title="Open the screen this approval is about">
                  <ExternalLink size={13} /> {view.label}
                </button>
              )}
            </div>
            {approvalName && <small className="ap-scope-sub">{approvalName}</small>}
            {layersOf(c.steps).map((layer, li) => (
              <ul className="ap-layer-steps compact" key={li}>
                {layer.map(s => (
                  <li key={s.id} className={'ap-step compact ' + s.status.toLowerCase()}>
                    <div className="ap-step-top">
                      <span className="ap-layer-no">{li + 1}</span>
                      <span className="ap-step-who">{s.authorityName}</span>
                      <span className={'ap-pill ' + s.status.toLowerCase()}>{s.status === 'PENDING' && !onDecide ? 'Waiting' : (STEP_LABEL[s.status] ?? s.status)}</span>
                      {onDecide && s.canAct && (
                        <span className="ap-actions">
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
                  </li>
                ))}
              </ul>
            ))}
          </div>
        );
      })}
    </>
  );
}

/** The earlier rounds (after a reject the stage starts again with a new round). */
export function HistoryList({history}: {history: Scope[]}) {
  if (!history.length) return null;
  return (
    <details className="ap-history">
      <summary>
        <History size={15} /> Earlier rounds ({history.length})
      </summary>
      {history.map(c => (
        <div key={`${c.scopeName}-${c.roundNo}`} className="ap-scope old">
          <div className="ap-scope-title">
            <b>{c.scopeName}</b>
            <small>Round {c.roundNo}</small>
          </div>
          <ol>
            {c.steps.map(s => (
              <li key={s.id} className={'ap-step ' + s.status.toLowerCase()}>
                <div className="ap-step-top">
                  <b>{s.name}</b>
                  <span className={'ap-pill ' + s.status.toLowerCase()}>{STEP_LABEL[s.status] ?? s.status}</span>
                </div>
                <Decisions step={s} />
              </li>
            ))}
          </ol>
        </div>
      ))}
    </details>
  );
}
