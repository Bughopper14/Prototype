/** The two dialogs of the approval layer: the review of one step (Approve or Reject in ONE dialog, a reject needs a reason, and a button to request more documents), and submit a stage. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {api} from '@/shared/lib/api';
import {STAGE} from '@/shared/master-data';
import {Modal} from '@/shared/ui/Modal';
import {ChecklistCustomizeDialog} from '@/features/documents/components/checklist/ChecklistCustomizeDialog';
import {hasAuthority} from '@/shared/lib/auth';
import {ArrowRight, Check, FilePlus2, Loader2, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import {CrmRichTextEditor} from '@/shared/ui/CrmRichTextEditor';

function isHtmlEmpty(html?: string | null): boolean {
  if (!html) return true;
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
  return text.length === 0;
}

type Gap = {target: string; label: string; detail?: string};

/** Where each kind of missing item is filled in: the stage view and tab that hold it. */
const GAP_PLACE: Record<string, {stage?: string; tab: number; name: string}> = {
  FAP_FORM: {stage: STAGE.FAP, tab: 0, name: 'FAP Form'},
  PRE_ANALYSIS: {stage: STAGE.PRE_ANALYSIS, tab: 8, name: 'Pre-analysis form'},
  LEGAL: {stage: STAGE.FAP, tab: 5, name: 'Legal'},
  DOCUMENTS: {tab: 6, name: 'Documents'},
};

/** What is still missing for the final approval, with a button to the place that fixes each kind. */
function GapList({gaps, onOpen}: {gaps: Gap[]; onOpen: (gap: Gap) => void}) {
  return (
    <div className="error" style={{maxHeight: 260, overflowY: 'auto'}}>
      <strong>Requirements incomplete ({gaps.length}), please complete first:</strong>
      {Object.entries(GAP_PLACE).map(([target, place]) => {
        const items = gaps.filter(gap => gap.target === target);
        if (!items.length) return null;
        return (
          <div key={target} style={{marginTop: 10}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
              <strong>
                {place.name} ({items.length})
              </strong>
              <button type="button" className="button" onClick={() => onOpen(items[0])}>
                Open {place.name} <ArrowRight size={13} />
              </button>
            </div>
            <ul style={{margin: '4px 0 0', paddingLeft: 18}}>
              {items.map((gap, i) => (
                <li key={i}>
                  {gap.label}
                  {gap.detail && <span className="muted"> · {gap.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function ApprovalDecisionDialog() {
  const {a, user, onChange, notify, busy, setBusy, error, setError, decision, setDecision, comments, setComments, setActiveStage, setTab} = useWorkspace();
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [kind, setKind] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [requesting, setRequesting] = useState(false);
  // Rejecting a group: the approver picks which stages of the group open again (all of them to begin with)
  const groupRound = (a.approval?.current || []).find((c: any) => c.scope === 'GROUP' && c.steps.some((s: any) => s.id === decision?.stepId));
  const groupStages: any[] = groupRound ? (a.stageProgress || []).filter((s: any) => s.groupCode === groupRound.groupCode) : [];
  const [reopen, setReopen] = useState<string[]>([]);
  // The approved documents and deeds under a stage open with it, but each can stay approved (the problem may be one document only): ids that stay approved
  const [keep, setKeep] = useState<string[]>([]);
  const itemsOf = (stageCode: string) =>
    (a.approval?.current || [])
      .filter((c: any) => (c.scope === 'DOCUMENT' || c.scope === 'SECTION') && c.stageCode === stageCode && c.steps.length > 0 && c.steps.every((st: any) => st.status === 'APPROVED'))
      .map((c: any) => ({
        kind: c.scope === 'DOCUMENT' ? 'document' : 'deed',
        id: (c.scope === 'DOCUMENT' ? c.checklistId : c.subjectId) as string,
        name: c.scope === 'DOCUMENT' ? String(c.scopeName).replace(/^Document\s+/, '') : String(c.scopeName).replace(/^.*·\s*/, ''),
      }))
      .filter((i: any) => i.id);
  // Rejecting a stage: its approved documents and deeds can open again with it, but only when the approver chooses them (the problem may be the stage alone)
  const stageRound = (a.approval?.current || []).find((c: any) => c.scope === 'STAGE' && c.steps.some((s: any) => s.id === decision?.stepId));
  const stageItems = stageRound ? itemsOf(stageRound.stageCode) : [];
  const [also, setAlso] = useState<string[]>([]);
  useEffect(() => {
    if (decision) {
      setKind(decision.kind);
      setComments('');
    }
    setKeep([]);
    setAlso([]);
    setReopen(groupStages.map(s => s.stage));
  }, [decision?.stepId, decision?.kind]);
  if (!decision) return null;
  const reject = kind === 'REJECTED';
  const pickStages = reject && groupStages.length > 0;
  const canRequestDocuments = hasAuthority(user, 'CRM_DOCUMENT_UPLOAD');
  // the documents added to this application on top of its workflow's checklist: shown here so the choice stays visible
  const requested = (a.documentChecks || []).filter((d: any) => d.source === 'ADDED');
  const close = () => {
    setGaps([]);
    setDecision(null);
    setComments('');
  };
  const open = (gap: Gap) => {
    const place = GAP_PLACE[gap.target];
    if (!place) return;
    close();
    setError('');
    if (place.stage) setActiveStage(place.stage);
    setTab(place.tab);
  };
  const confirm = async () => {
    setBusy(true);
    setError('');
    setGaps([]);
    try {
      const remarks = isHtmlEmpty(comments) ? undefined : comments.trim();
      const kept = pickStages ? groupStages.filter(s => reopen.includes(s.stage)).flatMap(s => itemsOf(s.stage)).filter((i: any) => keep.includes(i.id)) : [];
      onChange(
        await api(`/applications/${a.id}/approvals/${decision.stepId}/decision`, 'POST', {
          decision: kind,
          remarks,
          ...(pickStages ? {reopenStages: reopen, keepApproved: {documents: kept.filter((i: any) => i.kind === 'document').map((i: any) => i.id), deeds: kept.filter((i: any) => i.kind === 'deed').map((i: any) => i.id)}} : {}),
          ...(reject && stageItems.length > 0 && also.length > 0
            ? {reopenItems: {documents: stageItems.filter((i: any) => i.kind === 'document' && also.includes(i.id)).map((i: any) => i.id), deeds: stageItems.filter((i: any) => i.kind === 'deed').map((i: any) => i.id)}}
            : {}),
        }),
      );
      setDecision(null);
      setComments('');
      notify(reject ? 'Rejected. The stage is open again for changes.' : 'Approved');
    } catch (e: any) {
      setError(e.message);
      setGaps(Array.isArray(e.missing) ? e.missing : []);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Review · ${decision.step}`} onClose={close}>
      <div className="modal-body">
        <p className="muted">
          {a.customer?.companyName} · {a.id}
        </p>
        <div className="ap-choice" role="tablist" aria-label="Your decision">
          <button type="button" role="tab" aria-selected={!reject} className={!reject ? 'on approve' : ''} onClick={() => setKind('APPROVED')}>
            <Check size={16} /> Approve
          </button>
          <button type="button" role="tab" aria-selected={reject} className={reject ? 'on reject' : ''} onClick={() => setKind('REJECTED')}>
            <X size={16} /> Reject
          </button>
        </div>
        {reject ? (
          <p>The person who works on this will see your reason and has to fix it before submitting again.</p>
        ) : (
          <p>The next step (if there is one) is sent to the people who can approve it.</p>
        )}
        {pickStages && (
          <fieldset className={'ap-reopen' + (reopen.length === 0 ? ' invalid' : '')}>
            <legend>
              <b>Stages to open again</b>
              <span className="ap-reopen-req">Required · at least 1</span>
            </legend>
            <p className="ap-reopen-help">
              Ticked stages are unlocked and ask for approval again from the first step; their approved documents and deeds open with them unless you untick them. Saved data stays.
            </p>
            <div className="ap-reopen-count">
              <span>
                {reopen.length} of {groupStages.length} selected
              </span>
              <button type="button" onClick={() => setReopen(reopen.length === groupStages.length ? [] : groupStages.map((s: any) => s.stage))}>
                {reopen.length === groupStages.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            {groupStages.map((s: any) => {
              const on = reopen.includes(s.stage);
              const items = itemsOf(s.stage);
              return (
                <div key={s.stage}>
                  <label className={'ap-reopen-item' + (on ? ' on' : '')}>
                    <input type="checkbox" checked={on} onChange={e => setReopen(r => (e.target.checked ? [...r, s.stage] : r.filter(c => c !== s.stage)))} />
                    <span className="ap-reopen-name">{s.name}</span>
                    <span className="ap-reopen-state">{on ? 'Opens again' : 'Stays approved'}</span>
                  </label>
                  {on && items.length > 0 && (
                    <div className="ap-reopen-sub">
                      <small>Opens with it. Untick what is fine: it stays approved.</small>
                      {items.map((i: any) => (
                        <label key={i.id} className={'ap-reopen-sub-item' + (keep.includes(i.id) ? ' kept' : '')}>
                          <input type="checkbox" checked={!keep.includes(i.id)} onChange={e => setKeep(k => (e.target.checked ? k.filter(x => x !== i.id) : [...k, i.id]))} />
                          <span>
                            {i.kind === 'document' ? 'Document' : 'Legal deed'} · {i.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {reopen.length === 0 && <div className="ap-reopen-error">Choose at least one stage to open again.</div>}
          </fieldset>
        )}
        {reject && stageItems.length > 0 && (
          <fieldset className="ap-reopen">
            <legend>
              <b>Also open again</b>
              <span className="ap-reopen-req">Optional</span>
            </legend>
            <p className="ap-reopen-help">The stage always opens again. Tick the documents or deeds that have a problem too; the ones you leave unticked stay approved.</p>
            <div className="ap-reopen-count">
              <span>
                {also.length} of {stageItems.length} selected
              </span>
              <button type="button" onClick={() => setAlso(also.length === stageItems.length ? [] : stageItems.map((i: any) => i.id))}>
                {also.length === stageItems.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            {stageItems.map((i: any) => (
              <label key={i.id} className={'ap-reopen-item' + (also.includes(i.id) ? ' on' : '')}>
                <input type="checkbox" checked={also.includes(i.id)} onChange={e => setAlso(x => (e.target.checked ? [...x, i.id] : x.filter(y => y !== i.id)))} />
                <span className="ap-reopen-name">
                  {i.kind === 'document' ? 'Document' : 'Legal deed'} · {i.name}
                </span>
                <span className="ap-reopen-state">{also.includes(i.id) ? 'Opens again' : 'Stays approved'}</span>
              </label>
            ))}
          </fieldset>
        )}
        <div style={{marginTop: 12, marginBottom: 8}}>
          <label style={{display: 'block', fontWeight: 600, color: '#334155', marginBottom: 6}}>
            {reject ? 'Reason (required)' : 'Notes (optional)'}
          </label>
          <CrmRichTextEditor
            id="approval-decision-remarks"
            value={comments || ''}
            onChange={setComments}
            height={200}
            minHeight={160}
            showMenubar={true}
            placeholder={reject ? 'What must be fixed?' : 'Notes (optional)...'}
          />
        </div>
        {canRequestDocuments && (
          <div className="ap-request-docs">
            <div>
              <b>Is a document missing?</b>
              <small>Add it to the checklist of this application. It shows there for whoever uploads the files.</small>
              {requested.length > 0 && (
                <div className="ap-requested" aria-label="Documents requested for this application" style={{display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8}}>
                  <small style={{width: '100%', fontWeight: 600}}>Requested ({requested.length}):</small>
                  {requested.map((d: any) => (
                    <span key={d.id} className="wf-badge active" title={d.stageCode}>
                      {d.documentName}
                      {(d.files || []).length ? ` · ${(d.files || []).length} file` : ' · no file yet'}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="button small" onClick={() => setRequesting(true)}>
              <FilePlus2 size={14} /> Request documents
            </button>
          </div>
        )}
        {gaps.length > 0 ? <GapList gaps={gaps} onOpen={open} /> : error && <div className="error">{error}</div>}
      </div>
      <div className="modal-actions">
        <button className="button" onClick={close}>
          Cancel
        </button>
        <button className={'button ' + (reject ? 'ap-reject-solid' : 'primary')} disabled={busy || (reject && isHtmlEmpty(comments)) || (pickStages && reopen.length === 0)} onClick={confirm}>
          {busy ? <Loader2 size={15} className="spin" /> : reject ? <X size={15} /> : <Check size={15} />}
          {reject ? 'Reject' : 'Approve'}
        </button>
      </div>
      {requesting && <ChecklistCustomizeDialog application={a} onChange={onChange} notify={notify} onClose={() => setRequesting(false)} />}
    </Modal>
  );
}

export function SubmitStageDialog() {
  const {a, onChange, notify, busy, setBusy, error, setError, submitStageCode, setSubmitStageCode, comments, setComments, setActiveStage, setTab} = useWorkspace();
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [checking, setChecking] = useState(false);
  // what the stage still lacks is shown as soon as the dialog opens, before Submit is pressed
  useEffect(() => {
    if (!submitStageCode) return;
    setComments('');
    let alive = true;
    setChecking(true);
    api(`/applications/${a.id}/stages/${encodeURIComponent(submitStageCode)}/check`)
      .then((r: any) => alive && setGaps(Array.isArray(r?.missing) ? r.missing : []))
      .catch(() => alive && setGaps([]))
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [submitStageCode, a.id]);
  if (!submitStageCode) return null;
  const stage = (a.stageProgress || []).find((s: any) => s.stage === submitStageCode);
  const close = () => {
    setGaps([]);
    setSubmitStageCode(null);
    setComments('');
  };
  // the stage is submitted only when it is complete: the list of what is missing has a button to the place that fixes it
  const open = (gap: Gap) => {
    const place = GAP_PLACE[gap.target];
    if (!place) return;
    close();
    setError('');
    if (place.stage) setActiveStage(place.stage);
    setTab(place.tab);
  };
  const confirm = async () => {
    setBusy(true);
    setError('');
    setGaps([]);
    try {
      const remarks = isHtmlEmpty(comments) ? undefined : comments.trim();
      await api(`/applications/${a.id}/stages/${submitStageCode}/submit`, 'POST', {remarks});
      onChange(await api(`/applications/${a.id}`));
      setSubmitStageCode(null);
      setComments('');
      notify(`${stage?.name ?? 'Stage'} submitted`);
    } catch (e: any) {
      setError(e.message);
      setGaps(Array.isArray(e.missing) ? e.missing : []);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Submit ${stage?.name ?? 'stage'}`} onClose={close}>
      <div className="modal-body">
        <p className="muted">
          {a.customer?.companyName} · {a.id}
        </p>
        <p>
          The stage is locked and sent for approval. If something is rejected it opens again so you can fix it and submit once more.
        </p>
        <div style={{marginTop: 12, marginBottom: 8}}>
          <label style={{display: 'block', fontWeight: 600, color: '#334155', marginBottom: 6}}>
            Notes (optional)
          </label>
          <CrmRichTextEditor
            id="approval-submit-remarks"
            value={comments || ''}
            onChange={setComments}
            height={180}
            minHeight={140}
            showMenubar={true}
            placeholder="Notes (optional)..."
          />
        </div>
        {gaps.length > 0 ? <GapList gaps={gaps} onOpen={open} /> : error && <div className="error">{error}</div>}
      </div>
      <div className="modal-actions">
        <button className="button" onClick={close}>
          Cancel
        </button>
        <button className="button primary" disabled={busy || checking || gaps.length > 0} title={gaps.length ? 'Complete the list above first' : undefined} onClick={confirm}>
          {busy || checking ? <Loader2 size={15} className="spin" /> : <ArrowRight size={15} />} Submit
        </button>
      </div>
    </Modal>
  );
}
