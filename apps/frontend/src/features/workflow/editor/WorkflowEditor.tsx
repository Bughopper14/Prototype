/**
 * One workflow as a board: columns are the steps in running order, each step holds one or more groups (groups in the same
 * step run together), each group holds stage cards. Click a stage to set its form, required fields and documents.
 * A draft that no application uses is edited and saved whole; anything else is read-only.
 */
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  Link2,
  ListChecks,
  Minus,
  Plus,
  Power,
  PowerOff,
  Save,
  Trash2,
  Unlink,
  XCircle,
} from 'lucide-react';
import {Fragment, useCallback, useEffect, useState} from 'react';
import {Modal} from '@/shared/ui/Modal';
import {workflowApi, type Catalog, type Definition, type Group, type Issue, type Stage, type WorkflowHeader} from '../api';
import {joinPreviousStep, moveGroup, removePart, sortGroups, sortStages, splitFromStep, stepsOf, tempKey} from '../definition-ops';
import {GROUP_COLORS} from '../palette';
import {StagePanel} from './StagePanel';
import {useConfirm} from '../ConfirmDialog';

const STATUS_LABEL = {DRAFT: 'Draft', ACTIVE: 'Active', INACTIVE: 'Deactivated'} as const;

function Stepper({value, onChange, disabled, label}: {value: number; onChange: (v: number) => void; disabled: boolean; label: string}) {
  return (
    <span className="wf-stepper" title={label}>
      <button type="button" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} aria-label="Earlier">
        <Minus size={16} />
      </button>
      <b>{value}</b>
      <button type="button" disabled={disabled} onClick={() => onChange(value + 1)} aria-label="Later">
        <Plus size={16} />
      </button>
    </span>
  );
}

export function WorkflowEditor({id, catalog, onBack, notify}: {id: string; catalog: Catalog; onBack: () => void; notify: (m: string) => void}) {
  const [workflow, setWorkflow] = useState<WorkflowHeader | null>(null);
  const [def, setDefState] = useState<Definition | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [panel, setPanel] = useState<{key: string; tab: 'fields' | 'documents'} | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof workflowApi.history>> | null>(null);
  const [name, setName] = useState('');

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
          To change the process, build a new workflow and activate it. Running applications keep the workflow they started in.
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

      <p className="wf-how">
        <b>How to read this:</b> the steps run from left to right. Groups in the <b>same step run together</b>. Inside a group, stages with the same
        order run together too. Click a stage to choose its required fields and documents.
      </p>

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
                          <button className="wf-chip" disabled={si === 0 && step.groups.length === 1} onClick={() => setDef(moveGroup(def, group.key, -1))} title="Move to an earlier step">
                            <ChevronLeft size={16} /> Earlier
                          </button>
                          <button className="wf-chip" disabled={si === steps.length - 1 && step.groups.length === 1} onClick={() => setDef(moveGroup(def, group.key, 1))} title="Move to a later step">
                            Later <ChevronRight size={16} />
                          </button>
                          {step.groups.length > 1 ? (
                            <button className="wf-chip" onClick={() => setDef(splitFromStep(def, group.key))} title="Run after the others instead of together">
                              <Unlink size={16} /> Run on its own
                            </button>
                          ) : (
                            si > 0 && (
                              <button className="wf-chip" onClick={() => setDef(joinPreviousStep(def, group.key))} title="Run together with the previous step">
                                <Link2 size={16} /> Run with previous
                              </button>
                            )
                          )}
                        </div>
                      )}

                      <div className="wf-stages">
                        {stages.map(stage => {
                          const together = stages.filter(s => s.order === stage.order).length > 1;
                          return (
                            <div className="wf-stage" key={stage.key}>
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
                              <div className="wf-stage-row">
                                <span className="wf-label">Order</span>
                                <Stepper value={stage.order} disabled={locked} onChange={v => patchStage(stage.key, {order: v})} label="Stages with the same order run together" />
                                {together && <span className="wf-together">runs together</span>}
                              </div>
                              <div className="wf-stage-row">
                                <span className="wf-label">Dept</span>
                                <select disabled={locked} value={stage.departmentCode || ''} onChange={e => patchStage(stage.key, {departmentCode: e.target.value || null})}>
                                  <option value="">None</option>
                                  {catalog.departments.map(d => (
                                    <option key={d.code} value={d.code}>
                                      {d.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="wf-stage-row">
                                <span className="wf-label">Form</span>
                                <select disabled={locked} value={stage.formCode || ''} onChange={e => patchStage(stage.key, {formCode: e.target.value || null})}>
                                  <option value="">No form</option>
                                  {catalog.forms.map(f => (
                                    <option key={f.code} value={f.code}>
                                      {f.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="wf-stage-actions">
                                <button className="wf-tile" onClick={() => setPanel({key: stage.key, tab: 'fields'})}>
                                  <ListChecks size={20} />
                                  <b>{requiredCount(stage.key)}</b>
                                  <span>required fields</span>
                                </button>
                                <button className="wf-tile" onClick={() => setPanel({key: stage.key, tab: 'documents'})}>
                                  <FileText size={20} />
                                  <b>{docCount(stage.key)}</b>
                                  <span>documents</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {!stages.length && <div className="wf-note">No stage yet.</div>}
                      </div>
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
