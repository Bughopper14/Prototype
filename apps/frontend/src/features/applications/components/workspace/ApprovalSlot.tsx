/**
 * The approval of ONE place (a row of a repeating section, such as one deed), shown right where that place is on screen.
 *
 * A screen registers itself by passing the code of its place: `<ApprovalSlot scope="SECTION" code="LEGAL-DEEDS-AMENDMENTS" subjectId={deed.id} />`
 * (it reads the application and refreshes it through the workspace).
 * The slot shows nothing unless the workflow of the application has an approval for that code (`application.approvalPlaces`), so a screen
 * can carry it without knowing any authority name. What it shows comes from the backend: the round of this place and, for each step,
 * `canAct` (the person holds the authority of the step). One review button (the dialog holds Approve and Reject) is drawn only when `canAct` is true.
 */
import {api} from '@/shared/lib/api';
import {hasAuthority} from '@/shared/lib/auth';
import {ShieldCheck} from 'lucide-react';
import {useState, type ReactNode} from 'react';
import {STEP_LABEL, type Scope, type Step} from './approval-shared';
import {useWorkspace} from './WorkspaceContext';

type Props = {
  scope: 'SECTION';
  /** The code of the place: the section code in crm_master_form_sections. */
  code: string;
  /** The row of a repeating section (the id of the deed). */
  subjectId: string;
  /** Something drawn at the end of the status line (the row menu of a deed). */
  trailing?: ReactNode;
};

const stateOf = (steps: Step[]) =>
  steps.some(s => s.status === 'REJECTED' && !s.reopened)
    ? 'REJECTED'
    : steps.some(s => s.reopened)
      ? 'REOPENED'
      : steps.every(s => s.status === 'APPROVED')
        ? 'APPROVED'
        : 'OPEN';

export function ApprovalSlot({scope, code, subjectId, trailing}: Props) {
  const {a: application, user, onChange, notify, setDecision, setComments, setError} = useWorkspace();
  const [busy, setBusy] = useState(false);

  const places: any[] = application?.approvalPlaces || [];
  const registered = places.some(p => p.scope === scope && p.sectionCode === code);
  if (!registered || !application?.id) return null;

  const rounds: Scope[] = (application.approval?.current || []).filter(
    (c: Scope) => c.scope === scope && c.sectionCode === code && c.subjectId === subjectId,
  );
  const round = rounds[0];
  const steps = round?.steps || [];
  const state = round ? stateOf(steps) : 'NONE';
  const canSubmit = hasAuthority(user, 'CRM_WORKFLOW_SUBMIT') && (state === 'NONE' || state === 'REJECTED' || state === 'REOPENED');

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
  const submit = () =>
    run(
      `/applications/${application.id}/sections/${encodeURIComponent(code)}/rows/${encodeURIComponent(subjectId)}/submit-approval`,
      {},
      'Approval requested',
    );
  // the review dialog is the same as the other approvals: the person picks Approve or Reject inside it (notes optional, reason required for a reject)
  const decide = (step: Step, kind: 'APPROVED' | 'REJECTED') => {
    setComments('');
    setError('');
    setDecision({stepId: step.id, step: step.name, kind});
  };
  const actable = steps.filter(s => s.canAct);

  return (
    <div className="ap-slot" style={{display: 'grid', gap: 6, marginTop: 6}}>
      <div className="ap-slot-head">
        <span
          className={`ap-pill ${state.toLowerCase()}`}
          style={{display: 'inline-flex', gap: 6, alignItems: 'center', minWidth: 0}}
        >
          <ShieldCheck size={13} />
          {state === 'NONE'
            ? 'Approval not requested'
            : state === 'APPROVED'
              ? STEP_LABEL.APPROVED
              : state === 'REJECTED'
                ? STEP_LABEL.REJECTED
                : state === 'REOPENED'
                  ? STEP_LABEL.REOPENED
                  : 'Waiting for approval'}
        </span>
        {trailing}
      </div>
      {canSubmit && (
        <button type="button" className="button small" disabled={busy} onClick={submit}>
          {state === 'REJECTED' || state === 'REOPENED' ? 'Resubmit for approval' : 'Request approval'}
        </button>
      )}
      {actable.map(step => (
        <button
          key={step.id}
          type="button"
          className="button primary small"
          disabled={busy}
          onClick={() => decide(step, 'APPROVED')}
        >
          <ShieldCheck size={14} /> Review &amp; decide
        </button>
      ))}
    </div>
  );
}
