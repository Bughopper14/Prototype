/**
 * Customise the checklist of ONE application: take a default document off it, or add a document (one the workflow
 * offers, another master document, or a free-name one). Other applications keep the workflow's checklist.
 */
import {api} from '@/shared/lib/api';
import {departmentLabel} from '@/shared/lib/departments';
import {Modal} from '@/shared/ui/Modal';
import {Plus, Trash2, Undo2} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';

type Options = {
  pool: {workflowStageDocumentId: string; stageCode: string; code: string; name: string; isMandatory: boolean}[];
  masters: {code: string; name: string; departmentCode: string; isMandatory: boolean}[];
  overrides: {id: string; action: 'ADD' | 'REMOVE'; stageCode: string; code: string; name: string; reason: string | null; by: string}[];
  stages: {code: string; name: string; departmentCode: string | null}[];
  departments: {code: string; name: string}[];
};

export function ChecklistCustomizeDialog({
  application,
  onChange,
  onClose,
  notify,
}: {
  application: any;
  onChange: (app: any) => void;
  onClose: () => void;
  notify: (m: string) => void;
}) {
  const [options, setOptions] = useState<Options | null>(null);
  const [busy, setBusy] = useState(false);
  const [removeId, setRemoveId] = useState('');
  const [reason, setReason] = useState('');
  const [poolId, setPoolId] = useState('');
  const [masterCode, setMasterCode] = useState('');
  const [stage, setStage] = useState('');
  const [customName, setCustomName] = useState('');
  /** The department responsible for a document added to this application: asked for every added document; it starts as the department of the stage. */
  const [dept, setDept] = useState('');
  const [customMandatory, setCustomMandatory] = useState(false);

  const load = useCallback(() => api(`/applications/${application.id}/document-options`).then(setOptions), [application.id]);
  useEffect(() => {
    load().catch((e: any) => notify(e.message));
  }, [load, notify]);

  // Default documents that can still be taken off this application (no file, not removed yet)
  const removable = (application.documentChecks || []).filter(
    (d: any) => d.source === 'DEFAULT' && d.workflowStageDocumentId && !(d.files || []).length,
  );

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await fn();
      onChange(await api(`/applications/${application.id}`));
      await load();
      notify(done);
    } catch (e: any) {
      notify(e.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  const post = (body: object) => api(`/applications/${application.id}/document-overrides`, 'POST', body);

  if (!options) return <Modal title="Customize checklist" onClose={onClose}><div className="loading-strip" /></Modal>;
  const defaultStage = stage || options.stages[0]?.code || '';
  const stageDept = options.stages.find(x => x.code === defaultStage)?.departmentCode;
  const known = (code: string | null | undefined) => (code && options.departments.some(d => d.code === code) ? code : '');
  const department = known(dept) || known(stageDept) || options.departments[0]?.code || '';
  const deptSelect = (
    <label className="wf-dept-pick">
      Responsible department
      <select className="wf-input" value={department} onChange={e => setDept(e.target.value)}>
        {options.departments.map(d => <option key={d.code} value={d.code}>{departmentLabel(d)}</option>)}
      </select>
    </label>
  );
  const stageName = (code: string) => options.stages.find(x => x.code === code)?.name ?? code;

  return (
    <Modal title="Customize checklist" onClose={onClose}>
      <div className="modal-body" style={{display: 'grid', gap: 18, minWidth: 'min(560px, 86vw)'}}>
        <p className="muted" style={{margin: 0}}>
          Changes apply to this application only. Every other application keeps the checklist of its workflow.
        </p>

        {options.overrides.length > 0 && (
          <section>
            <h4 style={{margin: '0 0 6px'}}>Customised for this application</h4>
            <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6}}>
              {options.overrides.map(o => (
                <li key={o.id} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <span className={`wf-badge ${o.action === 'ADD' ? 'active' : 'draft'}`}>{o.action === 'ADD' ? 'Added' : 'Removed'}</span>
                  <span>{o.name} <span className="muted">({stageName(o.stageCode)}){o.reason ? ` · ${o.reason}` : ''}</span></span>
                  <button className="button small" style={{marginLeft: 'auto'}} disabled={busy} title="Back to the workflow's checklist" onClick={() => run(() => api(`/applications/${application.id}/document-overrides/${o.id}`, 'DELETE'), 'Customization cancelled')}>
                    <Undo2 size={13} /> Undo
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h4 style={{margin: '0 0 6px'}}>Take a default document off</h4>
          {removable.length === 0 ? (
            <p className="muted" style={{margin: 0}}>No default document can be taken off (a document that already has a file stays).</p>
          ) : (
            <div style={{display: 'grid', gap: 8}}>
              <select className="wf-input" value={removeId} onChange={e => setRemoveId(e.target.value)}>
                <option value="">Choose a document…</option>
                {removable.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.documentName} ({stageName(d.stageCode)}){d.isMandatory ? ' · mandatory' : ''}</option>
                ))}
              </select>
              <input className="wf-input" placeholder="Reason (required)" value={reason} onChange={e => setReason(e.target.value)} />
              <button
                className="button small"
                disabled={busy || !removeId || !reason.trim()}
                onClick={() => {
                  const d = removable.find((x: any) => x.id === removeId);
                  void run(() => post({action: 'REMOVE', stageCode: d.stageCode, workflowStageDocumentId: d.workflowStageDocumentId, reason: reason.trim()}), 'Document taken off').then(() => {
                    setRemoveId('');
                    setReason('');
                  });
                }}
              >
                <Trash2 size={13} /> Take off
              </button>
            </div>
          )}
        </section>

        {options.pool.length > 0 && (
          <section>
            <h4 style={{margin: '0 0 6px'}}>Add a document the workflow offers</h4>
            {deptSelect}
            <div style={{display: 'flex', gap: 8}}>
              <select className="wf-input" value={poolId} onChange={e => setPoolId(e.target.value)}>
                <option value="">Choose a document…</option>
                {options.pool.map(p => (
                  <option key={p.workflowStageDocumentId} value={p.workflowStageDocumentId}>{p.name} ({stageName(p.stageCode)})</option>
                ))}
              </select>
              <button className="button small primary" disabled={busy || !poolId || !department} onClick={() => {
                const p = options.pool.find(x => x.workflowStageDocumentId === poolId)!;
                void run(() => post({action: 'ADD', stageCode: p.stageCode, workflowStageDocumentId: poolId, departmentCode: department}), 'Document added').then(() => setPoolId(''));
              }}>
                <Plus size={13} /> Add
              </button>
            </div>
          </section>
        )}

        <section>
          <h4 style={{margin: '0 0 6px'}}>Add another document</h4>
          <div style={{display: 'grid', gap: 8}}>
            <select className="wf-input" value={defaultStage} onChange={e => setStage(e.target.value)}>
              {options.stages.map(s => <option key={s.code} value={s.code}>Stage: {s.name}</option>)}
            </select>
            {deptSelect}
            {options.masters.length > 0 && (
              <div style={{display: 'flex', gap: 8}}>
                <select className="wf-input" value={masterCode} onChange={e => setMasterCode(e.target.value)}>
                  <option value="">From Master Data…</option>
                  {options.masters.map(m => <option key={m.code} value={m.code}>{m.name} ({m.code})</option>)}
                </select>
                <button className="button small primary" disabled={busy || !masterCode || !department} onClick={() => void run(() => post({action: 'ADD', stageCode: defaultStage, documentCode: masterCode, departmentCode: department}), 'Document added').then(() => setMasterCode(''))}>
                  <Plus size={13} /> Add
                </button>
              </div>
            )}
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
              <input className="wf-input" style={{flex: '1 1 220px'}} placeholder="Or a document name, e.g. Surat Keterangan Domisili" value={customName} onChange={e => setCustomName(e.target.value)} />
              <label className="wf-check"><input type="checkbox" checked={customMandatory} onChange={e => setCustomMandatory(e.target.checked)} /> Mandatory</label>
              <button className="button small primary" disabled={busy || !customName.trim() || !department} onClick={() => void run(() => post({action: 'ADD', stageCode: defaultStage, customName: customName.trim(), departmentCode: department, isMandatory: customMandatory}), 'Document added').then(() => setCustomName(''))}>
                <Plus size={13} /> Add
              </button>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
