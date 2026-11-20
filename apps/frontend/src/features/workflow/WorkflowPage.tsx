import {AccessGate} from '@/features/crm/components/AccessGate';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {hasAuthority} from '@/shared/lib/auth';
import {PageHeading} from '@/features/crm/components/PageHeading';
import {Modal} from '@/shared/ui/Modal';
import {toCode} from '@liugong/shared';
import {ChevronRight, Layers, Lock, Pencil, Plus, Power, PowerOff, Trash2, Zap, History} from 'lucide-react';
import {Fragment, useCallback, useEffect, useMemo, useState} from 'react';
import {useSearchParams} from 'react-router';
import {workflowApi, type Catalog, type WorkflowHeader} from './api';
import {WorkflowEditor} from './editor/WorkflowEditor';
import {GROUP_COLORS} from './palette';
import {useConfirm} from './ConfirmDialog';

const STATUS_LABEL = {ACTIVE: 'Active', INACTIVE: 'Not active'} as const;

type Flow = NonNullable<WorkflowHeader['flow']>;

/** The pipeline of a workflow as colored chips: one color per group, steps separated by an arrow, parallel stages marked. */
function Pipeline({flow}: {flow: Flow}) {
  const steps = useMemo(() => {
    const out: {order: number; groups: {name: string; color: string; stages: Flow[number]['stages']}[]}[] =
      [];
    flow.forEach((g, gi) => {
      const group = {
        name: g.name,
        color: GROUP_COLORS[gi % GROUP_COLORS.length],
        stages: [...g.stages].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
      };
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
        Pipeline ({steps.length} step{steps.length === 1 ? '' : 's'}, {stageCount} stage
        {stageCount === 1 ? '' : 's'})
      </b>
      <div className="wf-pipe-row">
        {steps.map((step, si) => (
          <Fragment key={step.order}>
            {si > 0 && <ChevronRight size={16} className="wf-pipe-arrow" />}
            <div className="wf-pipe-step">
              {step.groups.flatMap(g =>
                g.stages.map(s => {
                  const parallel =
                    step.groups.length > 1 || g.stages.filter(x => x.order === s.order).length > 1;
                  return (
                    <span
                      key={`${g.name}-${s.name}`}
                      className="wf-chip-stage"
                      style={{borderColor: g.color, color: g.color, background: `${g.color}12`}}
                      title={g.name}
                    >
                      {si + 1}. {s.name}
                      <em>
                        {parallel ? <Zap size={12} /> : <Lock size={12} />}{' '}
                        {parallel ? 'Parallel' : 'Sequential'}
                      </em>
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

function NewWorkflowDialog({
  rows,
  onClose,
  onCreated,
  notify,
}: {
  rows: WorkflowHeader[];
  onClose: () => void;
  onCreated: (id: string) => void;
  notify: (m: string) => void;
}) {
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
        <p className="wf-new-lead">
          The workflow starts empty. You add its groups, stages, required fields and documents on the next
          screen, then activate it.
        </p>

        <label className="wf-new-field">
          <span>
            Name{' '}
            <em className="req" title="Required" aria-label="required">
              *
            </em>
          </span>
          <input
            value={name}
            autoFocus
            placeholder="e.g. Fast-track repeat order"
            maxLength={150}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && !busy && void create()}
          />
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
          <textarea
            value={description}
            rows={2}
            maxLength={500}
            placeholder="What is this workflow for?"
            onChange={e => setDescription(e.target.value)}
          />
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
    workflowApi
      .history(workflow.id)
      .then(setRows)
      .catch(() => setRows([]));
  }, [workflow.id]);
  return (
    <Modal title={`History of ${workflow.name}`} onClose={onClose} className="wf-history-modal">
      {!rows ? (
        <div className="loading-strip" />
      ) : (
        <table className="wf-table">
          <thead>
            <tr>
              <th>Frozen</th>
              <th>When</th>
              <th>By</th>
              <th>Applications</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(h => (
              <tr key={h.id}>
                <td>#{h.freezeVersion}{h.isLatest ? ' (newest)' : ''}</td>
                <td>{new Date(h.at).toLocaleString('id-ID')}</td>
                <td>{h.by}</td>
                <td>{h.applications}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="muted">
                  Not frozen yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

function WorkflowList({
  rows,
  onOpen,
  onNew,
  onChanged,
  notify,
}: {
  rows: WorkflowHeader[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onChanged: () => void;
  notify: (m: string) => void;
}) {
  const {user} = useCrm();
  // Reading a workflow needs CRM_WORKFLOW_VIEW; creating, changing, deleting and switching the active one need CRM_WORKFLOW_EDIT
  const canEdit = hasAuthority(user, 'CRM_WORKFLOW_EDIT');
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
      title: 'Set workflow active',
      message: `New applications will start in "${w.name}". Applications that are already running keep the frozen copy they started with, and the current active workflow is switched off.`,
      confirmLabel: 'Set active',
      icon: 'power',
    })) && run(() => workflowApi.activate(w.id), `${w.name} is now active`);
  const deactivate = async (w: WorkflowHeader) =>
    (await confirmAsk({
      title: 'Switch workflow off',
      message: `New applications cannot be created until another workflow is set active. Running applications are not affected.`,
      confirmLabel: 'Switch off',
      tone: 'danger',
      icon: 'off',
    })) && run(() => workflowApi.deactivate(w.id), `${w.name} switched off`);

  const remove = async (w: WorkflowHeader) =>
    (await confirmAsk({
      title: 'Delete workflow',
      message: `"${w.name}" is deleted. Applications that already run on it keep their frozen copy and are not affected.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: 'off',
    })) && run(() => workflowApi.remove(w.id), `${w.name} deleted`);

  const stateOf = (w: WorkflowHeader) => (w.isActive ? 'ACTIVE' : 'INACTIVE');
  const shown = rows.filter(w => statusFilter === 'ALL' || stateOf(w) === statusFilter);

  return (
    <>
      <header className="wf-top">
        <div className="wf-top-icon">
          <Layers size={28} />
        </div>
        <div className="wf-top-text">
          <h3>Workflow Catalog</h3>
          <p>
            Pick a workflow to <b>manage its steps, stages and documents</b>, or create a new one. New
            applications always start in the <b>active</b> workflow.
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
        </select>
        {canEdit && (
          <button className="wf-btn primary" onClick={onNew}>
            <Plus size={17} /> Create new workflow
          </button>
        )}
      </header>

      <div className="wf-note-banner">
        <p>
          A workflow is the route an application takes. Steps run from left to right, groups in the same step
          run together, and each stage lists the fields and documents it requires. A workflow can be
          edited at any time: every save makes a new frozen copy, and applications that already run keep the copy they started with.
        </p>
      </div>

      <div className="wf-cards">
        {shown.map(w => {
          const stageCount = (w.flow || []).reduce((n, g) => n + g.stages.length, 0);
          return (
            <article key={w.id} className={`wf-card ${stateOf(w).toLowerCase()}`}>
              <header>
                <span className="wf-codechip">{w.code}</span>
                <span className="wf-ver">frozen #{w.freezeVersion ?? 0}</span>
                <span className="wf-spacer" />
                <span className={`wf-badge ${stateOf(w).toLowerCase()}`}>{STATUS_LABEL[stateOf(w)]}</span>
              </header>
              <h4>{w.name}</h4>
              <p className="wf-desc">{w.description || 'No description.'}</p>
              <dl className="wf-stats">
                <div>
                  <dt>Applications</dt>
                  <dd>{w.applications ?? 0}</dd>
                </div>
                <div>
                  <dt>Last frozen</dt>
                  <dd>{w.frozenAt ? new Date(w.frozenAt).toLocaleDateString('id-ID') : 'Not yet'}</dd>
                </div>
              </dl>
              <Pipeline flow={w.flow || []} />
              <button className="wf-open" onClick={() => onOpen(w.id)}>
                <Pencil size={16} /> {canEdit ? 'Manage steps & stages' : 'See details'} (
                {stageCount})
              </button>
              <footer>
                <button className="wf-btn small" onClick={() => setHistory(w)}>
                  <History size={15} /> History
                </button>
                {canEdit && !w.isActive && (
                  <button className="wf-btn small" onClick={() => remove(w)} title="Delete this workflow (its frozen copies stay)">
                    <Trash2 size={15} /> Delete
                  </button>
                )}
                {canEdit &&
                  (!w.isActive ? (
                    <button className="wf-btn small accent" onClick={() => activate(w)}>
                      <Power size={15} /> Set active
                    </button>
                  ) : (
                    <button className="wf-btn small" onClick={() => deactivate(w)}>
                      <PowerOff size={15} /> Switch off
                    </button>
                  ))}
              </footer>
            </article>
          );
        })}
        {canEdit && (
          <button className="wf-card-new" onClick={onNew}>
            <Plus size={26} />
            <b>Create new workflow</b>
            <span>Start empty, then add groups, stages and documents</span>
          </button>
        )}
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

  const reload = useCallback(
    () =>
      workflowApi
        .list()
        .then(setRows)
        .catch(e => notify(e.message)),
    [notify],
  );
  useEffect(() => {
    void reload();
    workflowApi
      .catalog()
      .then(setCatalog)
      .catch(e => notify(e.message));
  }, [reload, notify]);

  if (openId && catalog)
    return (
      <div className="wf-page">
        <WorkflowEditor
          id={openId}
          catalog={catalog}
          notify={notify}
          onBack={() => {
            setOpenId(null);
            void reload();
          }}
        />
      </div>
    );

  return (
    <div className="wf-page">
      <WorkflowList
        rows={rows}
        onOpen={setOpenId}
        onNew={() => setCreating(true)}
        onChanged={reload}
        notify={notify}
      />
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
      <AccessGate authority="CRM_WORKFLOW_VIEW" page="Workflow">
        <WorkflowSetup />
      </AccessGate>
    </>
  );
}
