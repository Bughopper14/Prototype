/**
 * One workflow as a board: columns are the steps in running order, each step holds one or more groups (groups in the same
 * step run together), each group holds stage cards. Click a stage to set its form, required fields and documents.
 * A draft that no application uses is edited and saved whole; anything else is read-only.
 */
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  Copy,
  History,
  ListChecks,
  Minus,
  Plus,
  Power,
  PowerOff,
  Save,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import {Fragment, useCallback, useEffect, useState} from 'react';
import {Modal} from '@/shared/ui/Modal';
import {workflowApi, type Catalog, type Definition, type Group, type Issue, type Stage, type WorkflowHeader} from '../api';
import {canMove, moveGroup, moveStage, removePart, runsTogether, setGroupTogether, setStageTogether, sortGroups, sortStages, stepsOf, tempKey} from '../definition-ops';
import {GROUP_COLORS} from '../palette';
import {ApprovalList} from './ApprovalList';
import {StagePanel, type StageTab} from './StagePanel';
import {useConfirm} from '../ConfirmDialog';
import {WorkflowDiagramView} from '../WorkflowDiagram';

const STATUS_LABEL = {DRAFT: 'Draft', ACTIVE: 'Active', INACTIVE: 'Deactivated'} as const;

export function WorkflowEditor({id, catalog, onBack, onOpen, notify}: {id: string; catalog: Catalog; onBack: () => void; /** Opens another workflow (the clone). */ onOpen?: (id: string) => void; notify: (m: string) => void}) {
  const [workflow, setWorkflow] = useState<WorkflowHeader | null>(null);
  const [def, setDefState] = useState<Definition | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [panel, setPanel] = useState<{key: string; tab: StageTab} | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof workflowApi.history>> | null>(null);
  const [name, setName] = useState('');
  const [view, setView] = useState<'steps' | 'diagram'>('steps');

  const load = useCallback(async () => {
    const r = await workflowApi.get(id);
    setWorkflow(r.workflow);
    setName(r.workflow.name);
    setDefState(r.definition);
    setDirty(false);
  }, [id]);

  useEffect(() => {
    load().catch(e => notify(e.message));
  }, [load, notify]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const setDef = (d: Definition) => {
    setDefState(d);
    setDirty(true);
    setIssues([]);
  };

  const save = useCallback(async () => {
    if (!def) return false;
    setSaving(true);
    try {
      const r: any = await workflowApi.saveDefinition(id, def);
      setWorkflow(r.workflow);
      setDefState(r.definition);
      setDirty(false);
      notify('Saved');
      return true;
    } catch (e: any) {
      notify(e.message || 'Could not save');
      return false;
    } finally {
      setSaving(false);
    }
  }, [def, id, notify]);

  async function saveName() {
    if (!workflow || !workflow.editable || name.trim() === workflow.name || !name.trim()) return setName(workflow?.name ?? '');
    try {
      await workflowApi.rename(id, {name: name.trim()});
      setWorkflow({...workflow, name: name.trim()});
    } catch (e: any) {
      notify(e.message);
      setName(workflow.name);
    }
  }

  const [confirmAsk, confirmDialog] = useConfirm();

  async function activate() {
    if (!workflow) return;
    if (dirty && !(await save())) return;
    setBusy(true);
    try {
      const check = await workflowApi.validate(id);
      setIssues(check.issues);
      if (!check.ok) return notify('Fix the problems shown first');
      if (!(await confirmAsk({title: 'Activate workflow', message: `New applications will start in "${workflow.name}". Applications that are already running keep their workflow, and the current active workflow is deactivated.`, confirmLabel: 'Activate', icon: 'power'}))) return;
      await workflowApi.activate(id);
      notify(`${workflow.name} is now active`);
      await load();
    } catch (e: any) {
      notify(e.message || 'Could not activate');
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    if (!workflow) return;
    if (!(await confirmAsk({title: 'Deactivate workflow', message: 'New applications cannot be created until another workflow is activated. Running applications are not affected.', confirmLabel: 'Deactivate', tone: 'danger', icon: 'off'}))) return;
    setBusy(true);
    try {
      await workflowApi.deactivate(id);
      notify('Workflow deactivated');
      await load();
    } catch (e: any) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function clone() {
    if (dirty && !(await confirmAsk({title: 'Clone without saving?', message: 'Your unsaved changes are not copied. The clone is made from the saved workflow.', confirmLabel: 'Clone'}))) return;
    setBusy(true);
    try {
      const made = await workflowApi.clone(id);
      notify(`Cloned as ${made.workflow.name}`);
      onOpen?.(made.workflow.id);
    } catch (e: any) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function openHistory() {
    try {
      setHistory(await workflowApi.history(id));
    } catch (e: any) {
      notify(e.message);
    }
  }

  if (!workflow || !def) return <div className="loading-strip" />;
  const locked = !workflow.editable;
  const steps = stepsOf(def);
  const groupIndex = new Map(sortGroups(def.groups).map((g, i) => [g.key, i]));
  const groupColor = (key: string) => GROUP_COLORS[(groupIndex.get(key) ?? 0) % GROUP_COLORS.length];

  /* ---------- edits ---------- */
  const patchGroup = (key: string, patch: Partial<Group>) => setDef({...def, groups: def.groups.map(g => (g.key === key ? {...g, ...patch} : g))});
  const patchStage = (key: string, patch: Partial<Stage>) => setDef({...def, stages: def.stages.map(s => (s.key === key ? {...s, ...patch} : s))});
  const nextStepNo = def.groups.length ? Math.max(...def.groups.map(g => g.order)) + 1 : 1;
  const addGroup = (order: number) => {
    const key = tempKey('g');
    const stageKey = tempKey('s');
    setDef({
      ...def,
      groups: [...def.groups, {key, name: `Group ${def.groups.length + 1}`, order}],
      stages: [...def.stages, {key: stageKey, groupKey: key, name: 'New stage', departmentCode: null, order: 1, formCode: null}],
    });
  };
  const addStage = (group: Group) => {
    const mine = def.stages.filter(s => s.groupKey === group.key);
    setDef({
      ...def,
      stages: [...def.stages, {key: tempKey('s'), groupKey: group.key, name: `Stage ${mine.length + 1}`, departmentCode: null, order: mine.length ? Math.max(...mine.map(s => s.order)) + 1 : 1, formCode: null}],
    });
  };
  const requiredCount = (key: string) => def.fields.filter(f => f.stageKey === key && f.mandatory).length;
  const approvalCount = (key: string) => def.approvals.filter(a => a.stageKey === key).length;
  const docCount = (key: string) => def.documents.filter(d => d.stageKey === key).length;
  const panelStage = panel ? def.stages.find(s => s.key === panel.key) : undefined;
  const errors = issues.filter(i => i.level === 'error');

  return (
    <div className="wf-editor">
      <header className="wf-bar">
        <button className="wf-btn" onClick={async () => (!dirty || (await confirmAsk({title: 'Leave without saving?', message: 'Your changes to this workflow have not been saved.', confirmLabel: 'Leave', tone: 'danger'}))) && onBack()}>
          <ArrowLeft size={18} /> Workflows
        </button>
        <div className="wf-title">
          <div className="wf-title-row">
          {workflow.editable ? (
            <input className="wf-title-input" value={name} onChange={e => setName(e.target.value)} onBlur={saveName} aria-label="Workflow name" />
          ) : (
            <h2 className="wf-title-text">{workflow.name}</h2>
          )}
          <span className={`wf-badge ${workflow.status.toLowerCase()}`}>{STATUS_LABEL[workflow.status]}</span>
          </div>
        </div>
        <span className="wf-spacer" />
        <span className="wf-info" title="Workflow version and the number of applications that run on it">
          <span>Version {workflow.versionNo}</span>
          <span>{workflow.applications ?? 0} application{workflow.applications === 1 ? '' : 's'}</span>
        </span>
        <button className="wf-btn" onClick={openHistory}>
          <History size={18} /> History
        </button>
        <button className="wf-btn" disabled={busy || saving} onClick={clone} title="Make a new draft with the same steps, stages, fields, documents and approvals">
          <Copy size={18} /> Clone
        </button>
        {workflow.status === 'ACTIVE' && (
          <button className="wf-btn" disabled={busy} onClick={deactivate}>
            <PowerOff size={18} /> Deactivate
          </button>
        )}
        {workflow.status !== 'ACTIVE' && (
          <button className="wf-btn" disabled={busy || saving} onClick={activate}>
            <Power size={18} /> Activate
          </button>
        )}
        {!locked && (
          <button className="wf-btn primary" disabled={!dirty || saving} onClick={save}>
            <Save size={18} /> {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        )}
      </header>

      {locked && (
        <div className="wf-banner info">
          {workflow.status === 'DRAFT' ? 'Applications already run on this workflow, so it is read-only.' : workflow.applications ? 'Applications run on this workflow, so it is read-only.' : 'Only a draft can be edited.'}{' '}
          To change the process, <b>clone</b> it, change the clone and activate that. Running applications keep the workflow they started in.
        </div>
      )}
      {errors.length > 0 && (
        <div className="wf-banner error">
          <b>
            <XCircle size={18} /> Fix these before activating
          </b>
          <ul>{errors.map((e, i) => <li key={i}>{e.message}</li>)}</ul>
        </div>
      )}
      {errors.length === 0 && issues.some(i => i.level === 'warning') && (
        <div className="wf-banner warn">
          <AlertTriangle size={18} /> {issues.filter(i => i.level === 'warning').map(i => i.message).join(' ')}
        </div>
      )}

      <div className="wf-tabs" role="tablist" aria-label="Workflow view">
        <button type="button" role="tab" aria-selected={view === 'steps'} onClick={() => setView('steps')}>
          Steps &amp; stages
        </button>
        <button type="button" role="tab" aria-selected={view === 'diagram'} onClick={() => setView('diagram')}>
          Diagram
        </button>
      </div>

      {view === 'diagram' ? (
        <WorkflowDiagramView def={def} catalog={catalog} />
      ) : (
        <>

      <div className="wf-board-scroll">
        <div className="wf-board">
          {steps.length === 0 && (
            <div className="wf-empty-board">
              <b>Nothing here yet</b>
              <span>Add the first group. Each group holds the stages of one part of the process.</span>
              {!locked && (
                <button className="wf-btn primary big" onClick={() => addGroup(1)}>
                  <Plus size={20} /> Add the first group
                </button>
              )}
            </div>
          )}
          {steps.map((step, si) => (
            <Fragment key={step.order}>
              {si > 0 && (
                <div className="wf-arrow" aria-hidden>
                  <ArrowRight size={26} />
                </div>
              )}
              <section className="wf-step">
                <header className="wf-step-head">
                  <span className="wf-step-no">Step {si + 1}</span>
                  {step.groups.length > 1 && <em>{step.groups.length} groups run together</em>}
                </header>
                {step.groups.map(group => {
                  const stages = sortStages(def.stages.filter(s => s.groupKey === group.key));
                  return (
                    <article className="wf-group" key={group.key} style={{borderTopColor: groupColor(group.key)}}>
                      <div className="wf-group-head">
                        <input className="wf-group-name" style={{color: groupColor(group.key)}} disabled={locked} value={group.name} onChange={e => patchGroup(group.key, {name: e.target.value})} aria-label="Group name" />
                        {!locked && (
                          <button
                            className="wf-icon-btn danger"
                            title="Remove this group and its stages"
                            onClick={async () => (await confirmAsk({title: 'Remove group', message: `Remove "${group.name}" together with its stages?`, confirmLabel: 'Remove', tone: 'danger'})) && setDef(removePart(def, 'group', group.key))}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                      {!locked && (
                        <div className="wf-group-tools">
                          <button className="wf-chip" disabled={!canMove(def.groups, group.key, -1)} onClick={() => setDef(moveGroup(def, group.key, -1))} title="Swap places with the group before">
                            <ChevronLeft size={16} /> Earlier
                          </button>
                          <button className="wf-chip" disabled={!canMove(def.groups, group.key, 1)} onClick={() => setDef(moveGroup(def, group.key, 1))} title="Swap places with the group after">
                            Later <ChevronRight size={16} />
                          </button>
                          {groupIndex.get(group.key) !== 0 && (
                            <select
                              className="wf-chip"
                              value={runsTogether(def.groups, group.key) ? 'with' : 'after'}
                              onChange={e => setDef(setGroupTogether(def, group.key, e.target.value === 'with'))}
                              aria-label="When this group runs"
                            >
                              <option value="after">Runs after the group before</option>
                              <option value="with">Runs together with the group before</option>
                            </select>
                          )}
                        </div>
                      )}

                      <div className="wf-stages">
                        {stages.map(stage => {
                          const together = stages.filter(s => s.order === stage.order).length > 1;
                          return (
                            <div className={`wf-stage ${stage.departmentCode ? '' : 'incomplete'}`} key={stage.key}>
                              <div className="wf-stage-top">
                                <input className="wf-stage-name" disabled={locked} value={stage.name} onChange={e => patchStage(stage.key, {name: e.target.value})} aria-label="Stage name" />
                                {!locked && (
                                  <button
                                    className="wf-icon-btn danger"
                                    title="Remove stage"
                                    onClick={async () => (await confirmAsk({title: 'Remove stage', message: `Remove "${stage.name}" together with its rules?`, confirmLabel: 'Remove', tone: 'danger'})) && setDef(removePart(def, 'stage', stage.key))}
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                )}
                              </div>
                              <button type="button" className="wf-stage-meta" onClick={() => setPanel({key: stage.key, tab: 'details'})} title="Open the details of this stage">
                                <span className={stage.departmentCode ? '' : 'wf-missing-text'}>{stage.departmentCode ? (catalog.departments.find(d => d.code === stage.departmentCode)?.name ?? stage.departmentCode) : 'Department needed'}</span>
                                <span>{catalog.forms.find(f => f.code === stage.formCode)?.name ?? 'No form'}</span>
                                {together && <em className="wf-together">runs together</em>}
                              </button>
                              {!locked && stages.length > 1 && (
                                <div className="wf-group-tools">
                                  <button className="wf-chip" disabled={!canMove(stages, stage.key, -1)} onClick={() => setDef(moveStage(def, stage.key, -1))} title="Swap places with the stage before">
                                    <ChevronUp size={16} />
                                  </button>
                                  <button className="wf-chip" disabled={!canMove(stages, stage.key, 1)} onClick={() => setDef(moveStage(def, stage.key, 1))} title="Swap places with the stage after">
                                    <ChevronDown size={16} />
                                  </button>
                                  {stages[0].key !== stage.key && (
                                    <select
                                      className="wf-chip"
                                      value={runsTogether(stages, stage.key) ? 'with' : 'after'}
                                      onChange={e => setDef(setStageTogether(def, stage.key, e.target.value === 'with'))}
                                      aria-label="When this stage runs"
                                    >
                                      <option value="after">After the stage before</option>
                                      <option value="with">Together with the stage before</option>
                                    </select>
                                  )}
                                </div>
                              )}
                              <div className="wf-stage-actions three">
                                <button className="wf-tile" onClick={() => setPanel({key: stage.key, tab: 'fields'})}>
                                  <ListChecks size={18} />
                                  <b>{requiredCount(stage.key)}</b>
                                  <span>fields</span>
                                </button>
                                <button className="wf-tile" onClick={() => setPanel({key: stage.key, tab: 'documents'})}>
                                  <FileText size={18} />
                                  <b>{docCount(stage.key)}</b>
                                  <span>documents</span>
                                </button>
                                <button className="wf-tile" onClick={() => setPanel({key: stage.key, tab: 'approval'})}>
                                  <ShieldCheck size={18} />
                                  <b>{approvalCount(stage.key)}</b>
                                  <span>approvals</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {!stages.length && <div className="wf-note">No stage yet.</div>}
                      </div>
                      <ApprovalList def={def} setDef={setDef} catalog={catalog} locked={locked} target={{scope: 'GROUP', groupKey: group.key}} title="Approval of the whole group" />
                      {!locked && (
                        <button className="wf-add" onClick={() => addStage(group)}>
                          <Plus size={18} /> Add stage
                        </button>
                      )}
                    </article>
                  );
                })}
                {!locked && (
                  <button className="wf-add dashed" onClick={() => addGroup(step.order)}>
                    <Plus size={18} /> Add a group that runs together
                  </button>
                )}
              </section>
            </Fragment>
          ))}
          {steps.length > 0 && !locked && (
            <>
              <div className="wf-arrow" aria-hidden>
                <ArrowRight size={26} />
              </div>
              <button className="wf-new-step" onClick={() => addGroup(nextStepNo)}>
                <Plus size={22} />
                <b>Add a step</b>
                <span>A new group after the last step</span>
              </button>
            </>
          )}
        </div>
      </div>
        </>
      )}

      {confirmDialog}
      {panel && panelStage && <StagePanel def={def} setDef={setDef} catalog={catalog} stage={panelStage} locked={locked} initialTab={panel.tab} onClose={() => setPanel(null)} />}

      {history && (
        <Modal title="History" onClose={() => setHistory(null)} className="wf-history-modal">
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
              {history.map((h, i) => (
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
              {!history.length && (
                <tr>
                  <td colSpan={4} className="muted">
                    No history yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );

}
