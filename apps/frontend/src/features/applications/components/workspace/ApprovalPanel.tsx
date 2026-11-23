/**
 * The SUBMITTER's view of the approval of one application: where each stage stands and the button to submit it, why something was
 * rejected. Deciding is done by somebody else, in the Approvals tab (ApproverView). It is a tab of its own so it never sits above the forms.
 */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {reopenedStep, whoOf, type Approval} from '@/features/applications/components/workspace/approval-shared';
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
  // The approval of a whole group has no button: it starts by itself when every stage of the group is submitted. It is listed here so the submitter sees where it stands.
  const groupRows = ((a.approvalPlaces || []) as any[])
    .filter(p => p.scope === 'GROUP')
    .map(p => {
      const group = (a.workflow?.groups || []).find((g: any) => g.code === p.groupCode);
      const round = ap.current.find(c => c.scope === 'GROUP' && c.groupCode === p.groupCode);
      const steps = round?.steps || [];
      const allSubmitted = (group?.stageCodes || []).every((code: string) => stages.find(st => st.stage === code)?.submitted);
      const state = !round
        ? 'NONE'
        : steps.some(x => x.status === 'REJECTED' && !x.reopened)
          ? 'REJECTED'
          : steps.some(x => x.reopened)
            ? 'REOPENED'
            : steps.every(x => x.status === 'APPROVED')
              ? 'APPROVED'
              : 'OPEN';
      const waiting = [...new Set(steps.filter(x => x.status === 'PENDING').map(whoOf))];
      return {code: p.groupCode as string, name: (group?.name || p.groupCode) as string, approval: (p.approvalName || p.approvalCode || '') as string, state, allSubmitted, waiting};
    });

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
          {groupRows.length > 0 && (
            <>
              <h4 style={{marginTop: 16}}>Group approval</h4>
              <ul className="ap-stages">
                {groupRows.map(g => (
                  <li key={g.code} className={g.state === 'APPROVED' ? 'done' : g.state === 'OPEN' ? 'sent' : ''}>
                    <span className="ap-stage-name">
                      <b>{g.name}</b>
                      <small>{g.approval}</small>
                    </span>
                    <span className="ap-stage-state">
                      {g.state === 'APPROVED' ? (
                        <>
                          <CheckCircle2 size={16} /> Approved
                        </>
                      ) : g.state === 'REJECTED' || g.state === 'REOPENED' ? (
                        <>
                          <AlertTriangle size={16} /> {g.state === 'REJECTED' ? 'Rejected' : 'Opened again'}
                        </>
                      ) : g.state === 'OPEN' ? (
                        <>
                          <Clock size={16} /> Waiting{g.waiting.length ? ` for ${g.waiting.join(', ')}` : ''}
                        </>
                      ) : (
                        <small className="muted">{g.allSubmitted ? 'Starting…' : 'Starts by itself when every stage of this group is submitted.'}</small>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
