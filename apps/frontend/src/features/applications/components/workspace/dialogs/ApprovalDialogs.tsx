/** The two dialogs of the approval layer: the review of one step (Approve or Reject in ONE dialog, a reject needs a reason, and a button to request more documents), and submit a stage. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {api} from '@/shared/lib/api';
import {STAGE} from '@/shared/master-data';
import {Modal} from '@/shared/ui/Modal';
import {ChecklistCustomizeDialog} from '@/features/documents/components/checklist/ChecklistCustomizeDialog';
import {hasAuthority} from '@/shared/lib/auth';
import {ArrowRight, Check, FilePlus2, Loader2, X} from 'lucide-react';
import {useEffect, useState} from 'react';

type Gap = {target: string; label: string; detail?: string};

/** Where each kind of missing item is filled in: the stage view and tab that hold it. */
const GAP_PLACE: Record<string, {stage?: string; tab: number; name: string}> = {
  FAP_FORM: {stage: STAGE.FAP, tab: 0, name: 'FAP Form'},
  LEGAL: {stage: STAGE.FAP, tab: 5, name: 'Legal'},
  DOCUMENTS: {tab: 6, name: 'Documents'},
};

/** What is still missing for the final approval, with a button to the place that fixes each kind. */
function GapList({gaps, onOpen}: {gaps: Gap[]; onOpen: (gap: Gap) => void}) {
  return (
    <div className="error" style={{maxHeight: 260, overflowY: 'auto'}}>
      <strong>Belum lengkap ({gaps.length}), lengkapi dulu:</strong>
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
  useEffect(() => {
    if (decision) setKind(decision.kind);
  }, [decision?.stepId, decision?.kind]);
  if (!decision) return null;
  const reject = kind === 'REJECTED';
  const canRequestDocuments = hasAuthority(user, 'CRM_DOCUMENT_UPLOAD');
  const close = () => {
    setGaps([]);
    setDecision(null);
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
      onChange(await api(`/applications/${a.id}/approvals/${decision.stepId}/decision`, 'POST', {decision: kind, remarks: comments.trim() || undefined}));
      setDecision(null);
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
        <label>
          {reject ? 'Reason (required)' : 'Notes (optional)'}
          <textarea rows={4} value={comments} onChange={e => setComments(e.target.value)} placeholder={reject ? 'What must be fixed?' : 'Add context for the next reviewer…'} />
        </label>
        {canRequestDocuments && (
          <div className="ap-request-docs">
            <div>
              <b>Is a document missing?</b>
              <small>Add it to the checklist of this application. It shows there for whoever uploads the files.</small>
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
        <button className={'button ' + (reject ? 'ap-reject-solid' : 'primary')} disabled={busy || (reject && !comments.trim())} onClick={confirm}>
          {busy ? <Loader2 size={15} className="spin" /> : reject ? <X size={15} /> : <Check size={15} />}
          {reject ? 'Reject' : 'Approve'}
        </button>
      </div>
      {requesting && <ChecklistCustomizeDialog application={a} onChange={onChange} notify={notify} onClose={() => setRequesting(false)} />}
    </Modal>
  );
}

export function SubmitStageDialog() {
  const {a, onChange, notify, busy, setBusy, error, setError, submitStageCode, setSubmitStageCode, comments, setComments} = useWorkspace();
  if (!submitStageCode) return null;
  const stage = (a.stageProgress || []).find((s: any) => s.stage === submitStageCode);
  const close = () => setSubmitStageCode(null);
  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/applications/${a.id}/stages/${submitStageCode}/submit`, 'POST', {remarks: comments.trim() || undefined});
      onChange(await api(`/applications/${a.id}`));
      setSubmitStageCode(null);
      notify(`${stage?.name ?? 'Stage'} submitted`);
    } catch (e: any) {
      setError(e.message);
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
        <label>
          Notes (optional)
          <textarea rows={3} value={comments} onChange={e => setComments(e.target.value)} placeholder="Anything the approvers should know…" />
        </label>
        {error && <div className="error">{error}</div>}
      </div>
      <div className="modal-actions">
        <button className="button" onClick={close}>
          Cancel
        </button>
        <button className="button primary" disabled={busy} onClick={confirm}>
          {busy ? <Loader2 size={15} className="spin" /> : <ArrowRight size={15} />} Submit
        </button>
      </div>
    </Modal>
  );
}
