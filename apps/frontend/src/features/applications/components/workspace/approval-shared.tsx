/** What the submitter view and the approver view share: the types of an approval, the layers of a step list and the list of what has to be approved. */
import {Check, History, X} from 'lucide-react';

export const STEP_LABEL: Record<string, string> = {WAITING: 'Waiting its turn', PENDING: 'Needs approval', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Closed'};

export type Step = {id: string; name: string; status: string; sortOrder: number; authorityName: string; canAct: boolean; decisions: {by: string; decision: string; remarks: string | null; decidedAt: string; via: string}[]};
export type Scope = {scope: string; scopeName: string; roundNo: number; steps: Step[]};
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

/** Everything that has to be approved, as layers. With onDecide the steps the person may decide show Approve and Reject; without it the list only shows. */
export function ScopeList({scopes, onDecide}: {scopes: Scope[]; onDecide?: (step: Step, kind: 'APPROVED' | 'REJECTED') => void}) {
  return (
    <>
      {scopes.map(c => (
        <div className="ap-scope" key={`${c.scope}-${c.scopeName}`}>
          <div className="ap-scope-title">
            <b>{c.scopeName}</b>
            {c.roundNo > 1 && <small>Round {c.roundNo}</small>}
          </div>
          {layersOf(c.steps).map((layer, li) => (
            <div className="ap-layer" key={li}>
              <div className="ap-layer-head">
                <span className="ap-layer-no">{li + 1}</span>
                <b>{li === 0 ? 'First' : 'Then'}</b>
                {layer.length > 1 && <em>all {layer.length} at the same time</em>}
              </div>
              <ul className="ap-layer-steps">
                {layer.map(s => (
                  <li key={s.id} className={'ap-step ' + s.status.toLowerCase()}>
                    <div className="ap-step-top">
                      <b>{s.name}</b>
                      <span className={'ap-pill ' + s.status.toLowerCase()}>{s.status === 'PENDING' && !onDecide ? 'Waiting' : (STEP_LABEL[s.status] ?? s.status)}</span>
                    </div>
                    <Decisions step={s} />
                    {onDecide && s.canAct && (
                      <div className="ap-actions">
                        <button type="button" className="button primary small" onClick={() => onDecide(s, 'APPROVED')}>
                          <Check size={14} /> Approve
                        </button>
                        <button type="button" className="button small ap-reject" onClick={() => onDecide(s, 'REJECTED')}>
                          <X size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
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
