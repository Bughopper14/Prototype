/**
 * The APPROVER's view (tab "Approvals"): what waits for the signed-in person, with Approve and Reject, then everything else of this
 * application as layers. Submitting is done by somebody else, in the panel above the tabs (ApprovalPanel).
 */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {HistoryList, ScopeList, type Approval, type Step} from '@/features/applications/components/workspace/approval-shared';
import {Check, ShieldCheck, X} from 'lucide-react';

export function ApproverView() {
  const {a, draft, setDecision, setComments, setError} = useWorkspace();
  if (draft.isNew || !a.approval) return <p className="muted">Nothing to approve yet.</p>;
  const ap = a.approval as Approval;
  const mine = ap.current.flatMap(c => c.steps.filter(s => s.canAct).map(s => ({scope: c.scopeName, step: s})));
  const decide = (step: Step, kind: 'APPROVED' | 'REJECTED') => {
    setComments('');
    setError('');
    setDecision({stepId: step.id, step: step.name, kind});
  };

  return (
    <section className="ap-panel" aria-label="Approvals">
      <header className="ap-head">
        <ShieldCheck size={22} />
        <div>
          <h3>Waiting for you</h3>
          <p>{mine.length ? 'Read what was submitted, then approve or reject. A reject needs a reason.' : 'Nothing waits for you on this application.'}</p>
        </div>
      </header>

      {mine.length > 0 && (
        <ul className="ap-todo">
          {mine.map(m => (
            <li key={m.step.id}>
              <div>
                <b>{m.scope}</b>
                <small>{m.step.name}</small>
              </div>
              <div className="ap-actions">
                <button type="button" className="button primary small" onClick={() => decide(m.step, 'APPROVED')}>
                  <Check size={14} /> Approve
                </button>
                <button type="button" className="button small ap-reject" onClick={() => decide(m.step, 'REJECTED')}>
                  <X size={14} /> Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="ap-col">
        <h4>All approvals of this application</h4>
        {ap.current.length === 0 && <p className="muted">Nothing to approve yet. Approval starts when a stage is submitted.</p>}
        <ScopeList scopes={ap.current} onDecide={decide} />
      </div>

      <HistoryList history={ap.history} />
    </section>
  );
}
