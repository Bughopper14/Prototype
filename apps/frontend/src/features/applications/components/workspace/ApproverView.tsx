/**
 * The APPROVER's view (tab "Approvals"): what waits for the signed-in person, with Approve and Reject, then everything else of this
 * application as layers. Submitting is done by somebody else, in the panel above the tabs (ApprovalPanel).
 */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {ApprovalSummary} from '@/features/applications/components/workspace/ApprovalSummary';
import {HistoryList, ScopeList, type Approval, type Step} from '@/features/applications/components/workspace/approval-shared';
import {Check, ChevronDown, ShieldCheck, X} from 'lucide-react';

export function ApproverView() {
  const {a, draft, setDecision, setComments, setError} = useWorkspace();
  if (draft.isNew || !a.approval) return <p className="muted">Nothing to approve yet.</p>;
  const ap = a.approval as Approval;
  const docs: any[] = a.documentChecks || [];
  const mine = ap.current.flatMap(c => c.steps.filter(s => s.canAct).map(s => ({scope: c.scopeName, round: c, step: s})));
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
          {mine.map(m => {
            const isDoc = m.round.scope === 'DOCUMENT';
            const doc = isDoc
              ? docs.find(
                  (x: any) =>
                    x.id === m.round.checklistId ||
                    (x.documentCode && m.round.documentCode && x.documentCode === m.round.documentCode),
                )
              : null;
            const canDecide = !isDoc || Boolean(doc && doc.files && doc.files.length > 0);

            return (
              <li key={m.step.id} style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10, width: '100%'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
                  <div>
                    <b>{m.scope}</b>
                    <small>{m.step.name}</small>
                  </div>
                  {canDecide ? (
                    <div className="ap-actions">
                      <button type="button" className="button primary small" onClick={() => decide(m.step, 'APPROVED')}>
                        <Check size={14} /> Approve
                      </button>
                      <button type="button" className="button small ap-reject" onClick={() => decide(m.step, 'REJECTED')}>
                        <X size={14} /> Reject
                      </button>
                    </div>
                  ) : (
                    <span
                      className="muted"
                      style={{
                        fontSize: 12,
                        fontStyle: 'italic',
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: '#f1f5f9',
                      }}
                    >
                      {!doc ? 'Document not found' : 'Document not uploaded'}
                    </span>
                  )}
                </div>
                <ApprovalSummary scope={m.round} />
              </li>
            );
          })}
        </ul>
      )}

      <details className="ap-col ap-fold">
        <summary>
          <ChevronDown size={16} className="ap-chev" />
          <h4>All approvals of this application</h4>
          <span className="ap-fold-count">{ap.current.length}</span>
          <span className="ap-fold-hint">
            <span className="when-closed">View all</span>
            <span className="when-open">Hide</span>
          </span>
        </summary>
        {ap.current.length === 0 && <p className="muted">Nothing to approve yet. Approval starts when a stage is submitted.</p>}
        <ScopeList scopes={ap.current} onDecide={decide} />
      </details>

      <HistoryList history={ap.history} current={ap.current} />
    </section>
  );
}
