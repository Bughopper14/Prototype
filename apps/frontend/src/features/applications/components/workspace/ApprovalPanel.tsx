/**
 * The SUBMITTER's view of the approval of one application: where each stage stands and the button to submit it, why something was
 * rejected. Deciding is done by somebody else, in the Approvals tab (ApproverView). It is a tab of its own so it never sits above the forms.
 */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {type Approval} from '@/features/applications/components/workspace/approval-shared';
import {api} from '@/shared/lib/api';
import {Badge} from '@/shared/ui/Badge';
import {date} from '@/shared/lib/format';
import {AlertTriangle, ArrowRight, CheckCircle2, Clock, Send} from 'lucide-react';
import {useEffect, useState} from 'react';

const SUMMARY: Record<string, string> = {
  IN_PROGRESS: 'Work on each stage, then submit it. Approval starts after you submit.',
  IN_APPROVAL: 'Submitted. Waiting for the approvers.',
  REJECTED: 'Something was rejected. Read the reason, fix it, then submit again.',
  APPROVED: 'Everything is approved.',
};

export function ApprovalPanel() {
  const {a, draft, user, isAdminUser, setError, setSubmitStageCode} = useWorkspace();
  // How many things each open stage still lacks, shown before anybody presses Submit
  const [missing, setMissing] = useState<Record<string, number>>({});
  const openStages: string[] = ((a.stageProgress || []) as any[]).filter(st => st.canSubmit && !st.submitted).map(st => st.stage);
  const openKey = openStages.join(',');
  useEffect(() => {
    if (draft.isNew || !a.id || !openStages.length) return;
    let alive = true;
    void Promise.all(openStages.map(code => api(`/applications/${a.id}/stages/${encodeURIComponent(code)}/check`).then((r: any) => [code, (r?.missing || []).length] as const).catch(() => [code, 0] as const))).then(
      rows => alive && setMissing(Object.fromEntries(rows)),
    );
    return () => {
      alive = false;
    };
  }, [a.id, openKey, draft.isNew]);
  if (draft.isNew || !a.approval) return null;
  const ap = a.approval as Approval;
  const stages: {stage: string; name: string; group: string; submitted: boolean; completed: boolean; canSubmit: boolean; blockedReason: string | null}[] = a.stageProgress || [];
  const canSubmitRole = isAdminUser || (user?.authorities || []).includes('CRM_WORKFLOW_SUBMIT');
  const rejected = ap.current.flatMap(c => c.steps.filter(s => s.status === 'REJECTED').map(s => ({scope: c.scopeName, step: s, decision: s.decisions.find(d => d.decision === 'REJECTED')})));
  const submit = (code: string) => {
    setError('');
    setSubmitStageCode(code);
  };

  return (
    <section className="ap-panel" aria-label="Submit for approval">
      <header className="ap-head">
        <Send size={22} />
        <div>
          <h3>Submit for approval</h3>
          <p>{SUMMARY[ap.state] ?? ''}</p>
        </div>
        <Badge status={ap.state} />
      </header>

      {rejected.map(r => (
        <div className="ap-rejected" key={r.step.id} role="alert">
          <AlertTriangle size={20} />
          <div>
            <b>
              {r.scope}: “{r.step.name}” was rejected
            </b>
            <p>{r.decision?.remarks || 'No reason was written.'}</p>
            <small>
              {r.decision?.by} · {r.decision?.decidedAt ? date(r.decision.decidedAt) : ''}
              {r.decision?.via === 'LARK' ? ' · from Lark' : ''}
            </small>
          </div>
        </div>
      ))}

      <div className="ap-grid single">
        <div className="ap-col">
          <h4>Stages</h4>
          <ul className="ap-stages">
            {stages.map(st => (
              <li key={st.stage} className={st.completed ? 'done' : st.submitted ? 'sent' : ''}>
                <span className="ap-stage-name">
                  <b>{st.name}</b>
                  <small>{st.group}</small>
                  {!st.submitted && !st.completed && st.canSubmit && missing[st.stage] > 0 && <small className="ap-missing">{missing[st.stage]} item(s) still missing. Open Submit to see what.</small>}
                </span>
                <span className="ap-stage-state">
                  {st.completed ? (
                    <>
                      <CheckCircle2 size={16} /> Done
                    </>
                  ) : st.submitted ? (
                    <>
                      <Clock size={16} /> Waiting
                    </>
                  ) : st.canSubmit && canSubmitRole ? (
                    <button type="button" className="button primary small" onClick={() => submit(st.stage)}>
                      Submit <ArrowRight size={14} />
                    </button>
                  ) : (
                    <small className="muted">{st.blockedReason || 'Not submitted yet'}</small>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
