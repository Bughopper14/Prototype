import {AccessGate} from '@/features/crm/components/AccessGate';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {PageHeading} from '@/features/crm/components/PageHeading';
import {Modal} from '@/shared/ui/Modal';
import {toCode} from '@liugong/shared';
import {ChevronRight, Copy, Layers, Lock, Pencil, Plus, Power, PowerOff, Zap, History} from 'lucide-react';
import {Fragment, useCallback, useEffect, useMemo, useState} from 'react';
import {useSearchParams} from 'react-router';
import {workflowApi, type Catalog, type WorkflowHeader} from './api';
import {WorkflowEditor} from './editor/WorkflowEditor';
import {GROUP_COLORS} from './palette';
import {useConfirm} from './ConfirmDialog';

const STATUS_LABEL = {DRAFT: 'Draft', ACTIVE: 'Active', INACTIVE: 'Deactivated'} as const;

type Flow = NonNullable<WorkflowHeader['flow']>;

/** The pipeline of a workflow as colored chips: one color per group, steps separated by an arrow, parallel stages marked. */
function Pipeline({flow}: {flow: Flow}) {
  const steps = useMemo(() => {
    const out: {order: number; groups: {name: string; color: string; stages: Flow[number]['stages']}[]}[] = [];
    flow.forEach((g, gi) => {
      const group = {name: g.name, color: GROUP_COLORS[gi % GROUP_COLORS.length], stages: [...g.stages].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))};
      const last = out[out.length - 1];
      if (last && last.order === g.order) last.groups.push(group);
      else out.push({order: g.order, groups: [group]});
    });
    return out;
  }, [flow]);
  const stageCount = flow.reduce((n, g) => n + g.stages.length, 0);

  if (!steps.length)
    return (
      <div className="wf-pipe empty">
        <b>Pipeline</b>
        <span>No step yet. Open the workflow to add the first group.</span>
      </div>
    );
  return (
    <div className="wf-pipe">
      <b>
        Pipeline ({steps.length} step{steps.length === 1 ? '' : 's'}, {stageCount} stage{stageCount === 1 ? '' : 's'})
      </b>
      <div className="wf-pipe-row">
        {steps.map((step, si) => (
          <Fragment key={step.order}>
            {si > 0 && <ChevronRight size={16} className="wf-pipe-arrow" />}
            <div className="wf-pipe-step">
              {step.groups.flatMap(g =>
                g.stages.map(s => {
                  const parallel = step.groups.length > 1 || g.stages.filter(x => x.order === s.order).length > 1;
                  return (
                    <span key={`${g.name}-${s.name}`} className="wf-chip-stage" style={{borderColor: g.color, color: g.color, background: `${g.color}12`}} title={g.name}>
                      {si + 1}. {s.name}
                      <em>{parallel ? <Zap size={12} /> : <Lock size={12} />} {parallel ? 'Parallel' : 'Sequential'}</em>
                    </span>
                  );
                }),
              )}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/** The code the backend will give the workflow: the standard code (@liugong/shared), hyphens, never underscores. */
const previewCode = toCode;

function NewWorkflowDialog({rows, onClose, onCreated, notify}: {rows: WorkflowHeader[]; onClose: () => void; onCreated: (id: string) => void; notify: (m: string) => void}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const code = previewCode(name);
  const taken = rows.some(r => r.code === code);
  async function create() {
    setBusy(true);
    try {
      const r = await workflowApi.create({name: name.trim(), description: description.trim() || undefined});
      onCreated(r.workflow.id);
    } catch (e: any) {
      notify(e.message || 'Could not create the workflow');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="New workflow" onClose={onClose} className="wf-new-modal">
      <div className="wf-new">
        <p className="wf-new-lead">The workflow starts empty. You add its groups, stages, required fields and documents on the next screen, then activate it.</p>

        <label className="wf-new-field">
          <span>
            Name <em className="req" title="Required" aria-label="required">*</em>
          </span>
          <input value={name} autoFocus placeholder="e.g. Fast-track repeat order" maxLength={150} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && !busy && void create()} />
          <small className={taken ? 'warn' : ''}>
            {code ? (
              <>
                Code: <b>{taken ? `${code} (taken, a number is added)` : code}</b>
              </>
            ) : (
              'The code is made from the name.'
            )}
          </small>
        </label>

        <label className="wf-new-field">
          <span>
            Description <em className="opt">optional</em>
          </span>
          <textarea value={description} rows={2} maxLength={500} placeholder="What is this workflow for?" onChange={e => setDescription(e.target.value)} />
        </label>

        <div className="wf-new-actions">
          <button className="wf-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="wf-btn primary big" disabled={busy || !name.trim()} onClick={create}>
            <Plus size={18} /> {busy ? 'Creating…' : 'Create workflow'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function HistoryDialog({workflow, onClose}: {workflow: WorkflowHeader; onClose: () => void}) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof workflowApi.history>> | null>(null);
  useEffect(() => {
    workflowApi.history(workflow.id).then(setRows).catch(() => setRows([]));
  }, [workflow.id]);
  return (
    <Modal title={`History of ${workflow.name}`} onClose={onClose} className="wf-history-modal">
      {!rows ? (
        <div className="loading-strip" />
      ) : (
        <table className="wf-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>By</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h, i) => (
              <tr key={i}>
                <td>{new Date(h.at).toLocaleString('id-ID')}</td>
                <td>
                  {h.action}
                  {h.previous ? ` (was ${h.previous})` : ''}
                </td>
                <td>{h.actor}</td>
                <td>{h.note}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="muted">
                  No history yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

function WorkflowList({rows, onOpen, onNew, onChanged, notify}: {rows: WorkflowHeader[]; onOpen: (id: string) => void; onNew: () => void; onChanged: () => void; notify: (m: string) => void}) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | keyof typeof STATUS_LABEL>('ALL');
  const [confirmAsk, confirmDialog] = useConfirm();
  const [history, setHistory] = useState<WorkflowHeader | null>(null);
  async function run(fn: () => Promise<unknown>, done: string) {
    try {
      await fn();
      notify(done);
      onChanged();
    } catch (e: any) {
      notify(e.message);
    }
  }
  const activate = async (w: WorkflowHeader) =>
    (await confirmAsk({
      title: 'Activate workflow',
      message: `New applications will start in "${w.name}". Applications that are already running keep their workflow, and the current active workflow is deactivated.`,
      confirmLabel: 'Activate',
      icon: 'power',
    })) && run(() => workflowApi.activate(w.id), `${w.name} is now active`);
  const deactivate = async (w: WorkflowHeader) =>
    (await confirmAsk({
      title: 'Deactivate workflow',
      message: `New applications cannot be created until another workflow is activated. Running applications are not affected.`,
      confirmLabel: 'Deactivate',
      tone: 'danger',
      icon: 'off',
    })) && run(() => workflowApi.deactivate(w.id), `${w.name} deactivated`);

  /** A copy of the workflow as a new draft, opened right away (the way to change a workflow that applications run on). */
  const clone = async (w: WorkflowHeader) => {
    try {
      const made = await workflowApi.clone(w.id);
      notify(`Cloned as ${made.workflow.name}`);
      onChanged();
      onOpen(made.workflow.id);
    } catch (e: any) {
      notify(e.message);
    }
  };

  const shown = rows.filter(w => statusFilter === 'ALL' || w.status === statusFilter);

  return (
    <>
      <header className="wf-top">
        <div className="wf-top-icon">
          <Layers size={28} />
        </div>
        <div className="wf-top-text">
          <h3>Workflow Catalog</h3>
          <p>
            Pick a workflow to <b>manage its steps, stages and documents</b>, or create a new one. New applications always start in the <b>active</b> workflow.
          </p>
        </div>
        <select
          className="wf-status-filter"
          aria-label="Filter workflows by status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'ALL' | keyof typeof STATUS_LABEL)}
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">{STATUS_LABEL.ACTIVE}</option>
          <option value="INACTIVE">{STATUS_LABEL.INACTIVE}</option>
          <option value="DRAFT">{STATUS_LABEL.DRAFT}</option>
        </select>
        <button className="wf-btn primary" onClick={onNew}>
          <Plus size={17} /> Create new workflow
        </button>
      </header>

      <div className="wf-note-banner">
        <p>
          A workflow is the route an application takes. Steps run from left to right, groups in the same step run together, and each stage lists the fields and
          documents it requires. A workflow that applications already run on is locked; to change the process, create a new one and activate it.
        </p>
      </div>

      <div className="wf-cards">
        {shown.map(w => {
          const stageCount = (w.flow || []).reduce((n, g) => n + g.stages.length, 0);
          return (
            <article key={w.id} className={`wf-card ${w.status.toLowerCase()}`}>
              <header>
                <span className="wf-codechip">{w.code}</span>
                <span className="wf-ver">v{w.versionNo}</span>
                <span className="wf-spacer" />
                <span className={`wf-badge ${w.status.toLowerCase()}`}>{STATUS_LABEL[w.status]}</span>
              </header>
              <h4>{w.name}</h4>
              <p className="wf-desc">{w.description || 'No description.'}</p>
              <dl className="wf-stats">
                <div>
                  <dt>Applications</dt>
                  <dd>{w.applications ?? 0}</dd>
                </div>
                <div>
                  <dt>Activated</dt>
                  <dd>{w.activatedAt ? new Date(w.activatedAt).toLocaleDateString('id-ID') : 'Not yet'}</dd>
                </div>
              </dl>
              <Pipeline flow={w.flow || []} />
              <button className="wf-open" onClick={() => onOpen(w.id)}>
                <Pencil size={16} /> {w.editable ? 'Manage steps & stages' : 'See details'} ({stageCount})
              </button>
              <footer>
                <button className="wf-btn small" onClick={() => setHistory(w)}>
                  <History size={15} /> History
                </button>
                <button className="wf-btn small" onClick={() => clone(w)} title="Make a new draft with the same steps, stages, fields, documents and approvals">
                  <Copy size={15} /> Clone
                </button>
                {w.status !== 'ACTIVE' ? (
                  <button className="wf-btn small accent" onClick={() => activate(w)}>
                    <Power size={15} /> Activate
                  </button>
                ) : (
                  <button className="wf-btn small" onClick={() => deactivate(w)}>
                    <PowerOff size={15} /> Deactivate
                  </button>
                )}
              </footer>
            </article>
          );
        })}
        <button className="wf-card-new" onClick={onNew}>
          <Plus size={26} />
          <b>Create new workflow</b>
          <span>Start empty, then add groups, stages and documents</span>
        </button>
      </div>
      {confirmDialog}
      {history && <HistoryDialog workflow={history} onClose={() => setHistory(null)} />}
    </>
  );
}

function WorkflowSetup() {
  const {notify} = useCrm();
  const [rows, setRows] = useState<WorkflowHeader[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  // a link from another page (Master Approval) opens a workflow right away: /workflows?open=<id>
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get('open'));
  useEffect(() => {
    if (params.get('open')) setParams({}, {replace: true});
  }, [params, setParams]);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(() => workflowApi.list().then(setRows).catch(e => notify(e.message)), [notify]);
  useEffect(() => {
    void reload();
    workflowApi.catalog().then(setCatalog).catch(e => notify(e.message));
  }, [reload, notify]);

  if (openId && catalog)
    return (
      <div className="wf-page">
        <WorkflowEditor
          id={openId}
          catalog={catalog}
          notify={notify}
          onOpen={setOpenId}
          onBack={() => {
            setOpenId(null);
            void reload();
          }}
        />
      </div>
    );

  return (
    <div className="wf-page">
      <WorkflowList rows={rows} onOpen={setOpenId} onNew={() => setCreating(true)} onChanged={reload} notify={notify} />
      {creating && (
        <NewWorkflowDialog
          rows={rows}
          notify={notify}
          onClose={() => setCreating(false)}
          onCreated={id => {
            setCreating(false);
            void reload();
            setOpenId(id);
          }}
        />
      )}
    </div>
  );
}

export default function WorkflowRoute() {
  return (
    <>
      <PageHeading page="Workflow" />
      <AccessGate authority="CRM_WORKFLOW_MANAGE" page="Workflow">
        <WorkflowSetup />
      </AccessGate>
    </>
  );
}
