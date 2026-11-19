/**
 * The approval of ONE place (a row of a repeating section, such as one deed), shown right where that place is on screen.
 *
 * A screen registers itself by passing the code of its place: `<ApprovalSlot scope="SECTION" code="LEGAL-DEEDS-AMENDMENTS" subjectId={deed.id} />`
 * (it reads the application and refreshes it through the workspace).
 * The slot shows nothing unless the workflow of the application has an approval for that code (`application.approvalPlaces`), so a screen
 * can carry it without knowing any authority name. What it shows comes from the backend: the round of this place and, for each step,
 * `canAct` (the person holds the authority of the step). Approve and Reject are drawn only when `canAct` is true.
 */
import {api} from '@/shared/lib/api';
import {hasAuthority} from '@/shared/lib/auth';
import {Check, ShieldCheck, X} from 'lucide-react';
import {useState} from 'react';
import {STEP_LABEL, type Scope, type Step} from './approval-shared';
import {useWorkspace} from './WorkspaceContext';

type Props = {
  scope: 'SECTION';
  /** The code of the place: the section code in crm_master_form_sections. */
  code: string;
  /** The row of a repeating section (the id of the deed). */
  subjectId: string;
};

const stateOf = (steps: Step[]) => (steps.some(s => s.status === 'REJECTED') ? 'REJECTED' : steps.every(s => s.status === 'APPROVED') ? 'APPROVED' : 'OPEN');

export function ApprovalSlot({scope, code, subjectId}: Props) {
  const {a: application, user, onChange, notify} = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<Step | null>(null);
  const [remarks, setRemarks] = useState('');

  const places: any[] = application?.approvalPlaces || [];
  const registered = places.some(p => p.scope === scope && p.sectionCode === code);
  if (!registered || !application?.id) return null;

  const rounds: Scope[] = (application.approval?.current || []).filter((c: Scope) => c.scope === scope && c.sectionCode === code && c.subjectId === subjectId);
  const round = rounds[0];
  const steps = round?.steps || [];
  const state = round ? stateOf(steps) : 'NONE';
  const canSubmit = hasAuthority(user, 'CRM_WORKFLOW_SUBMIT') && (state === 'NONE' || state === 'REJECTED');

  const run = async (path: string, body: any, done: string) => {
    setBusy(true);
    try {
      onChange(await api(path, 'POST', body));
      notify(done);
    } catch (e: any) {
      notify(e.message || 'Could not complete this');
    } finally {
      setBusy(false);
    }
  };
  const submit = () => run(`/applications/${application.id}/sections/${encodeURIComponent(code)}/rows/${encodeURIComponent(subjectId)}/submit-approval`, {}, 'Approval requested');
  const decide = (step: Step, decision: 'APPROVED' | 'REJECTED') =>
    run(`/applications/${application.id}/approvals/${step.id}/decision`, {decision, remarks: remarks.trim() || undefined}, decision === 'APPROVED' ? 'Approved' : 'Rejected').then(() => {
      setRejecting(null);
      setRemarks('');
    });
  const actable = steps.filter(s => s.canAct);
  const waiting = steps.filter(s => s.status === 'PENDING').map(s => s.authorityName);

  return (
    <div className="ap-slot" style={{display: 'grid', gap: 6, marginTop: 6}}>
      <span className={`ap-pill ${state.toLowerCase()}`} style={{display: 'inline-flex', gap: 6, alignItems: 'center'}}>
        <ShieldCheck size={13} />
        {state === 'NONE' ? 'Approval not requested' : state === 'APPROVED' ? STEP_LABEL.APPROVED : state === 'REJECTED' ? STEP_LABEL.REJECTED : 'Waiting for approval'}
      </span>
      {state === 'OPEN' && waiting.length > 0 && <small className="muted">Waiting: {waiting.join(', ')}</small>}
      {canSubmit && (
        <button type="button" className="button small" disabled={busy} onClick={submit}>
          {state === 'REJECTED' ? 'Resubmit for approval' : 'Request approval'}
        </button>
      )}
      {actable.map(step => (
        <div key={step.id} className="ap-actions">
          <button type="button" className="button primary small" disabled={busy} onClick={() => decide(step, 'APPROVED')}>
            <Check size={14} /> Approve
          </button>
          <button type="button" className="button small ap-reject" disabled={busy} onClick={() => setRejecting(step)}>
            <X size={14} /> Reject
          </button>
        </div>
      ))}
      {rejecting && (
        <div style={{display: 'grid', gap: 6}}>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Why is it rejected? (required)" rows={2} aria-label="Reason" />
          <div className="ap-actions">
            <button type="button" className="button small ap-reject" disabled={busy || !remarks.trim()} onClick={() => decide(rejecting, 'REJECTED')}>
              Confirm reject
            </button>
            <button type="button" className="button small" onClick={() => setRejecting(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
