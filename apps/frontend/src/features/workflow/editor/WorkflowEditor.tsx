/**
 * One workflow as a board: columns are the steps in running order, each step holds one or more groups (groups in the same
 * step run together), each group holds stage cards. Click a stage to set its form, required fields and documents.
 * A draft that no application uses is edited and saved whole; anything else is read-only.
 */
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  FileText,
  History,
  ListChecks,
  Plus,
  Power,
  PowerOff,
  Save,
  ShieldCheck,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import {Fragment, useCallback, useEffect, useState} from 'react';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {hasAuthority} from '@/shared/lib/auth';
import {refreshMandatoryRules} from '@/shared/master-data';
import {Modal} from '@/shared/ui/Modal';
import {WorkflowHistory} from '../WorkflowHistory';
import {workflowApi, type Catalog, type Definition, type Group, type Issue, type Stage, type WorkflowHeader} from '../api';
import {placeGroup, placeStage, removePart, sortGroups, sortStages, stepsOf, tempKey, type Placement} from '../definition-ops';
import {MoveMenu} from './MoveMenu';
import {GROUP_COLORS} from '../palette';
import {ApprovalList} from './ApprovalList';
import {StagePanel, type StageTab} from './StagePanel';
import {useConfirm} from '../ConfirmDialog';
import {WorkflowDiagramView} from '../WorkflowDiagram';

export function WorkflowEditor({id, catalog, onBack, notify}: {id: string; catalog: Catalog; onBack: () => void; notify: (m: string) => void}) {
  // Changing a workflow needs CRM_WORKFLOW_EDIT; without it the editor is a read-only view
  const {user} = useCrm();
  const canEdit = hasAuthority(user, 'CRM_WORKFLOW_EDIT');
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
      void refreshMandatoryRules();
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
    if (!workflow || !canEdit || name.trim() === workflow.name || !name.trim()) return setName(workflow?.name ?? '');
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
      if (!(await confirmAsk({title: 'Set workflow active', message: `New applications will start in "${workflow.name}". Applications that are already running keep the version they started with, and the current active workflow is switched off.`, confirmLabel: 'Set active', icon: 'power'}))) return;
      await workflowApi.activate(id);
      void refreshMandatoryRules();
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
    if (!(await confirmAsk({title: 'Switch workflow off', message: 'New applications cannot be created until another workflow is set active. Running applications are not affected.', confirmLabel: 'Switch off', tone: 'danger', icon: 'off'}))) return;
    setBusy(true);
    try {
      await workflowApi.deactivate(id);
      notify('Workflow switched off');
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
  const locked = !canEdit;
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
          {canEdit ? (
            <input className="wf-title-input" value={name} onChange={e => setName(e.target.value)} onBlur={saveName} aria-label="Workflow name" />
          ) : (
            <h2 className="wf-title-text">{workflow.name}</h2>
          )}
          <span className={`wf-badge ${workflow.isActive ? 'active' : 'inactive'}`}>{workflow.isActive ? 'Active' : 'Not active'}</span>
          </div>
        </div>
        <span className="wf-spacer" />
        <span className="wf-info" title="The newest version and the number of applications that run on this workflow">
          <span>v{workflow.freezeVersion ?? 0}</span>
          <span>{workflow.applications ?? 0} application{workflow.applications === 1 ? '' : 's'}</span>
        </span>
        <button className="wf-btn" onClick={openHistory}>
          <History size={18} /> History
        </button>
        {canEdit && workflow.isActive && (
          <button className="wf-btn" disabled={busy} onClick={deactivate}>
            <PowerOff size={18} /> Switch off
          </button>
        )}
        {canEdit && !workflow.isActive && (
          <button className="wf-btn" disabled={busy || saving} onClick={activate}>
            <Power size={18} /> Set active
          </button>
        )}
        {!locked && (
          <button className="wf-btn primary" disabled={!dirty || saving} onClick={save}>
            <Save size={18} /> {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        )}
      </header>

      {locked && <div className="wf-banner info">You can only look at this workflow. Changing it needs the workflow edit authority.</div>}
      {errors.length > 0 && (
        <div className="wf-banner error">
          <b>
            <XCircle size={18} /> Fix these before setting it active
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
                  {step.groups.length > 1 && (
                    <em title={`${step.groups.length} groups run at the same time`}>
                      <Zap size={13} /> together
                    </em>
                  )}
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
                          <MoveMenu items={def.groups} itemKey={group.key} noun="group" onPlace={(to: Placement) => setDef(placeGroup(def, group.key, to))} />
                        </div>
                      )}

                      <div className="wf-stages">
                        {stages.map(stage => {
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
                              </button>
                              {!locked && stages.length > 1 && (
                                <div className="wf-group-tools">
                                  <MoveMenu items={stages} itemKey={stage.key} noun="stage" onPlace={(to: Placement) => setDef(placeStage(def, stage.key, to))} />
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
          <WorkflowHistory workflowId={id} rows={history} />
        </Modal>
      )}
    </div>
  );

}
