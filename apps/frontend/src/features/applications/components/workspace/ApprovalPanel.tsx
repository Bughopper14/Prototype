/**
 * The SUBMITTER's view of the approval of one application: where each stage stands and the button to submit it, why something was
 * rejected. Deciding is done by somebody else, in the Approvals tab (ApproverView). It is a tab of its own so it never sits above the forms.
 */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {reopenedStep, type Approval} from '@/features/applications/components/workspace/approval-shared';
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
  // Only what was rejected on its own is listed. What a rejected group opened again is not repeated one by one: the group card says how many.
  const rejected = ap.current.flatMap(c => c.steps.filter(s => s.status === 'REJECTED' && !s.reopened).map(s => ({scope: c.scopeName, kind: c.scope, step: s, decision: s.decisions.find(d => d.decision === 'REJECTED')})));
  const reopened = ap.current.filter(c => c.steps.some(reopenedStep));
  // What a rejected group opened again, by stage: the stage first, then the documents and deeds that opened with it.
  const stageName = (code: string) => stages.find(s => s.stage === code)?.name ?? code;
  const itemName = (c: {scope: string; scopeName: string}) => (c.scope === 'DOCUMENT' ? c.scopeName.replace(/^Document\s+/, '') : c.scopeName.replace(/^.*·\s*/, ''));
  const reopenedByStage = [...new Set(reopened.map(c => c.stageCode || ''))].filter(Boolean).map(code => ({
    code,
    name: stageName(code),
    stageItself: reopened.some(c => c.scope === 'STAGE' && c.stageCode === code),
    documents: [...new Set(reopened.filter(c => c.scope === 'DOCUMENT' && c.stageCode === code).map(itemName))],
    deeds: [...new Set(reopened.filter(c => c.scope === 'SECTION' && c.stageCode === code).map(itemName))],
  }));
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
            {r.decision?.remarks ? (
              <div
                className="ap-rejected-remarks"
                style={{margin: '4px 0', fontSize: '0.95em', color: '#1e293b'}}
                dangerouslySetInnerHTML={{__html: r.decision.remarks}}
              />
            ) : (
              <p>No reason was written.</p>
            )}
            {r.kind === 'GROUP' &&
              reopenedByStage.map(st => (
                <div key={st.code} style={{margin: '6px 0 10px'}}>
                  <p style={{margin: '0 0 2px'}}>
                    <b>Stage opened again: {st.name}</b>
                  </p>
                  {(st.documents.length > 0 || st.deeds.length > 0) && (
                    <>
                      <p className="muted" style={{margin: '0 0 2px'}}>
                        Opened with it. Each one asks for approval again after you submit:
                      </p>
                      <ul style={{margin: '2px 0 0 18px', padding: 0}}>
                        {st.documents.map(name => (
                          <li key={'d-' + name}>Document · {name}</li>
                        ))}
                        {st.deeds.map(name => (
                          <li key={'e-' + name}>Legal deed · {name}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ))}
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
