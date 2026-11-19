import {useCrm} from '@/features/crm/components/CrmProvider';
import {levelsOf} from '@/features/workflow/editor/ApprovalList';
import {Modal} from '@/shared/ui/Modal';
import {AlertTriangle, Copy, ExternalLink, History, Pencil, Plus, Power, PowerOff, ShieldCheck, Trash2, Users} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {pageHref} from '@/shared/lib/routes';
import {useNavigate} from 'react-router';
import {AuthorityPicker} from './AuthorityPicker';
import {masterApprovalApi, type ApprovalLevelInput, type ApprovalLog, type AuthorityChoice, type MasterApproval} from './api';

type Draft = {code: string | null; name: string; description: string; levels: ApprovalLevelInput[]};

const blank = (): Draft => ({code: null, name: '', description: '', levels: [{levelNo: 1, authorityName: ''}]});

/** The steps of an approval in one row: 1 → 2. Everyone named in a step must approve it before the next step starts. */
function LevelsText({approval}: {approval: MasterApproval}) {
  const layers = levelsOf(approval);
  return (
    <ol className="ma-flow">
      {layers.map((layer, i) => (
        <li key={layer.levelNo}>
          {i > 0 && (
            <span className="ma-arrow" aria-hidden>
              →
            </span>
          )}
          <div className="ma-level">
            <span className="ma-level-no" title={`Step ${i + 1}`}>
              {i + 1}
            </span>
            <div className="ma-level-chips">
              {layer.authorities.map((a, k) => (
                <span key={a} className="ma-chip-wrap">
                  {k > 0 && <small>and</small>}
                  <span className="ma-chip" title={a}>
                    {a}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** The steps of a draft: one list of approvers per step (the step number is its position, never typed). */
const stepsOfDraft = (levels: ApprovalLevelInput[]): string[][] => {
  const byNo = new Map<number, string[]>();
  for (const l of [...levels].sort((a, b) => a.levelNo - b.levelNo)) byNo.set(l.levelNo, [...(byNo.get(l.levelNo) || []), l.authorityName]);
  return byNo.size ? [...byNo.values()] : [['']];
};

function ApprovalEditor({draft, authorities, onClose, onSaved, notify}: {draft: Draft; authorities: AuthorityChoice[]; onClose: () => void; onSaved: () => void; notify: (m: string) => void}) {
  const [name, setName] = useState(draft.name);
  const [description, setDescription] = useState(draft.description);
  const [steps, setSteps] = useState<string[][]>(() => stepsOfDraft(draft.levels));
  const [busy, setBusy] = useState(false);
  const known = useMemo(() => new Set(authorities.map(a => a.name)), [authorities]);

  const setApprover = (si: number, ai: number, value: string) => setSteps(steps.map((st, i) => (i === si ? st.map((a, k) => (k === ai ? value : a)) : st)));
  const addApprover = (si: number) => setSteps(steps.map((st, i) => (i === si ? [...st, ''] : st)));
  const removeApprover = (si: number, ai: number) => setSteps(steps.map((st, i) => (i === si ? st.filter((_, k) => k !== ai) : st)).filter(st => st.length));
  const addStep = () => setSteps([...steps, ['']]);
  const removeStep = (si: number) => setSteps(steps.filter((_, i) => i !== si));
  const complete = !!name.trim() && steps.length > 0 && steps.every(st => st.length > 0 && st.every(Boolean));

  const save = async () => {
    setBusy(true);
    try {
      // the data stays as it was: the number of a step is its position
      const levels = steps.flatMap((st, i) => st.map(authorityName => ({levelNo: i + 1, authorityName})));
      const body = {name, description: description || null, levels};
      if (draft.code) await masterApprovalApi.update(draft.code, body);
      else await masterApprovalApi.create(body);
      notify(draft.code ? 'Approval saved' : 'Approval created');
      onSaved();
    } catch (e: any) {
      notify(e.message || 'Could not save the approval');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={draft.code ? `Edit approval ${draft.code}` : 'New approval'} onClose={onClose} className="wf-apl-modal">
      <div className="wf-apl-modal-body">
        <label className="ma-field">
          <span>Name</span>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="For example: Legal first, then Business Support and Credit Analyst" />
        </label>
        <label className="ma-field">
          <span>Description (optional)</span>
          <input value={description} onChange={e => setDescription(e.target.value)} maxLength={500} />
        </label>

        <div className="ma-steps-help">
          <b>Who approves, step by step</b>
          <small>
            Step 1 is asked first. When everyone in a step has approved, the next step is asked. Put more than one approver in a step when all of them must approve it. An application that already started keeps the steps
            it started with.
          </small>
        </div>

        {steps.map((st, si) => (
          <section className="ma-step" key={si}>
            <header>
              <span className="ma-level-no">{si + 1}</span>
              <b>{si === 0 ? 'Step 1: asked first' : `Step ${si + 1}: after step ${si} is approved`}</b>
              {steps.length > 1 && (
                <button type="button" className="wf-icon-btn danger" title={`Remove step ${si + 1}`} onClick={() => removeStep(si)}>
                  <Trash2 size={16} />
                </button>
              )}
            </header>
            {st.map((a, ai) => (
              <div className="ma-approver" key={ai}>
                <AuthorityPicker value={a} options={authorities} taken={st} onChange={v => setApprover(si, ai, v)} />
                <button type="button" className="wf-icon-btn danger" title="Remove this approver" disabled={st.length < 2 && steps.length < 2} onClick={() => removeApprover(si, ai)}>
                  <Trash2 size={16} />
                </button>
                {a && !known.has(a) && (
                  <p className="wf-apl-warn block">
                    <AlertTriangle size={14} /> This authority is not in User Management (or does not start with CRM_ and end with APPROVE, APPROVAL or APPROVER).
                  </p>
                )}
              </div>
            ))}
            <button type="button" className="wf-apl-add" onClick={() => addApprover(si)}>
              <Users size={14} /> Add an approver to step {si + 1} (all must approve)
            </button>
          </section>
        ))}

        <button type="button" className="wf-apl-add" onClick={addStep}>
          <Plus size={14} /> Add step {steps.length + 1} (asked after step {steps.length})
        </button>
        <p className="wf-muted">Need a new authority? Create it in User Management (its name must start with CRM_ and end with APPROVE, APPROVAL or APPROVER), then it appears in the list.</p>
        <div className="wf-apl-foot">
          <button type="button" className="wf-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="wf-btn primary" disabled={busy || !complete} onClick={save}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

const STATUS_TEXT = {DRAFT: 'Draft', ACTIVE: 'Active', INACTIVE: 'Inactive'} as const;
const when = (v?: string | null) => (v ? new Date(v).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'}) : '-');

/** The log of one approval: who created, edited, copied, activated, deactivated or removed it, and when. */
function HistoryDialog({code, onClose}: {code: string; onClose: () => void}) {
  const [rows, setRows] = useState<ApprovalLog[] | null>(null);
  useEffect(() => {
    void masterApprovalApi.history(code).then(setRows).catch(() => setRows([]));
  }, [code]);
  return (
    <Modal title="History of this approval" onClose={onClose} className="wf-apl-modal">
      <div className="wf-apl-modal-body">
        {!rows && <p className="wf-muted">Loading…</p>}
        {rows && !rows.length && <p className="wf-muted">Nothing was recorded yet.</p>}
        {rows && rows.length > 0 && (
          <ol className="ma-versions">
            {rows.map((r, i) => (
              <li key={i} className={`ma-version ${r.action === 'ADDED' ? 'active' : r.action === 'REMOVED' ? 'inactive' : 'draft'}`}>
                <header>
                  <b>{r.summary}</b>
                </header>
                <div className="ma-version-meta">
                  <span>{when(r.at)}</span>
                  {r.by && <span>by {r.by}</span>}
                </div>
                {(r.before || r.after) && (
                  <ul className="ma-diff">
                    {r.before && <li className="removed">− {r.before}</li>}
                    {r.after && <li className="added">+ {r.after}</li>}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
        <div className="wf-apl-foot">
          <button type="button" className="wf-btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Master approval: the body of the "Master Approval" category of Customize master data. */
export function MasterApprovals() {
  const {notify} = useCrm();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof masterApprovalApi.list>>>([]);
  const [authorities, setAuthorities] = useState<AuthorityChoice[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [historyOf, setHistoryOf] = useState<string | null>(null);
  // the card whose list of workflows is open (it closes when you click anywhere else)
  const [wfMenu, setWfMenu] = useState<string | null>(null);
  useEffect(() => {
    if (!wfMenu) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.ma-menu')) setWfMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [wfMenu]);
  const reload = useCallback(() => masterApprovalApi.list().then(setRows).catch(e => notify(e.message)), [notify]);
  useEffect(() => {
    void reload();
    masterApprovalApi.authorities().then(setAuthorities).catch(e => notify(e.message));
  }, [reload, notify]);

  const shown = rows.filter(a => statusFilter === 'ALL' || (a.status ?? 'ACTIVE') === statusFilter).filter(a => !q.trim() || `${a.code} ${a.name} ${a.levels.map(l => l.authorityName).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase()));

  const run = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      notify(done);
      void reload();
    } catch (e: any) {
      notify(e.message || 'Could not complete this');
    }
  };
  const clone = (a: MasterApproval) => run(() => masterApprovalApi.clone(a.code), 'Copied as a new draft');
  const activate = (a: MasterApproval) => {
    if (!window.confirm(`Activate "${a.name}"? From now on it is locked: it cannot be edited, only cloned.`)) return;
    void run(() => masterApprovalApi.activate(a.code), 'Approval activated');
  };
  const deactivate = (a: MasterApproval) => {
    if (!window.confirm(`Deactivate "${a.name}"? Workflows and applications that already use it keep working; it can no longer be chosen for a new place.`)) return;
    void run(() => masterApprovalApi.deactivate(a.code), 'Approval deactivated');
  };

  const remove = async (a: MasterApproval) => {
    if (!window.confirm(`Remove the approval ${a.name}?`)) return;
    try {
      await masterApprovalApi.remove(a.code);
      notify('Approval removed');
      void reload();
    } catch (e: any) {
      notify(e.message || 'Could not remove the approval');
    }
  };

  return (
    <div className="wf-page" style={{padding: '0 32px 32px'}}>
      <div className="ma-toolbar">
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search an approval or an authority…" aria-label="Search approvals" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} aria-label="Status" className="ma-filter">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <small className="wf-muted">{shown.length} of {rows.length} approvals</small>
        <button type="button" className="wf-btn primary" onClick={() => setDraft(blank())}>
          <Plus size={16} /> New approval
        </button>
      </div>
      {!shown.length && <p className="wf-muted">No approval found.</p>}
      <div className="ma-grid">
        {shown.map(a => (
          <section className="ma-card" key={a.code}>
            <div className="ma-card-head">
              <ShieldCheck size={18} />
              <div className="ma-card-title" title={a.code}>
                <b>{a.name}</b>
                {a.description && <small>{a.description}</small>}
              </div>
              <span className={`ma-status ${(a.status ?? 'ACTIVE').toLowerCase()}`}>{STATUS_TEXT[a.status ?? 'ACTIVE']}</span>
            </div>
            <LevelsText approval={a} />
            <footer className="ma-actions">
              {a.status === 'DRAFT' && (
                <>
                  <button type="button" className="wf-btn small" onClick={() => setDraft({code: a.code, name: a.name, description: a.description || '', levels: a.levels.map(l => ({levelNo: l.levelNo, authorityName: l.authorityName}))})}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button type="button" className="wf-btn small accent" onClick={() => activate(a)}>
                    <Power size={14} /> Activate
                  </button>
                  <button type="button" className="wf-btn small danger" disabled={!!a.usedIn} title={a.usedIn ? 'Used by a workflow, it cannot be removed' : 'Remove this draft'} onClick={() => remove(a)}>
                    <Trash2 size={14} /> Remove
                  </button>
                </>
              )}
              {a.status !== 'DRAFT' && (
                <button type="button" className="wf-btn small" onClick={() => clone(a)} title="Make a new draft copy with the same steps and approvers, to change it">
                  <Copy size={14} /> Clone
                </button>
              )}
              {a.status === 'ACTIVE' && (
                <button type="button" className="wf-btn small" onClick={() => deactivate(a)}>
                  <PowerOff size={14} /> Deactivate
                </button>
              )}
              <button type="button" className="wf-btn small" onClick={() => setHistoryOf(a.code)}>
                <History size={14} /> History
              </button>
              {a.workflows.length > 0 && (
                <span className="ma-menu">
                  <button type="button" className="wf-btn small" aria-expanded={wfMenu === a.code} onClick={() => setWfMenu(wfMenu === a.code ? null : a.code)}>
                    <ExternalLink size={14} /> Workflows ({a.workflows.length})
                  </button>
                  {wfMenu === a.code && (
                    <ul className="ma-menu-list" role="menu">
                      {a.workflows.map(w => (
                        <li key={w.id}>
                          <button type="button" role="menuitem" onClick={() => navigate(`${pageHref('Workflow')}?open=${w.id}`)}>
                            <span>{w.name}</span>
                            <em className={`ma-uses-status ${w.status.toLowerCase()}`}>{w.status}</em>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </span>
              )}
              {(a.applications ?? 0) > 0 && <small className="wf-muted">{a.applications} application{a.applications === 1 ? '' : 's'} running</small>}
            </footer>
          </section>
        ))}
      </div>
      {historyOf && <HistoryDialog code={historyOf} onClose={() => setHistoryOf(null)} />}
      {draft && (
        <ApprovalEditor
          draft={draft}
          authorities={authorities}
          notify={notify}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            void reload();
          }}
        />
      )}
    </div>
  );
}
