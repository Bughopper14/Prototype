/**
 * Customise the checklist of ONE application: take a default document off it, or add a document (one the workflow
 * offers, a master document, or "Others": a new document typed by name). Other applications keep the workflow's checklist.
 */
import {api} from '@/shared/lib/api';
import {departmentLabel} from '@/shared/lib/departments';
import {Modal} from '@/shared/ui/Modal';
import {ChevronDown, FilePlus2, Plus, Trash2, Undo2} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';

type Options = {
  pool: {stageCode: string; code: string; name: string; isMandatory: boolean}[];
  masters: {code: string; name: string}[];
  overrides: {id: string; action: 'ADD' | 'REMOVE'; stageCode: string; code: string; name: string; reason: string | null; by: string}[];
  stages: {code: string; name: string; departmentCode: string | null}[];
  departments: {code: string; name: string}[];
};

/** A dropdown that looks like the select it replaces, with a tick box on every row so several documents can be chosen at once. */
function MultiPick({
  items,
  picked,
  onToggle,
  placeholder,
  other,
}: {
  items: {key: string; label: string}[];
  picked: string[];
  onToggle: (key: string) => void;
  placeholder: string;
  /** The last row: a document that is not in the list, typed by name. */
  other?: {label: string; on: boolean; toggle: () => void};
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const count = picked.length + (other?.on ? 1 : 0);
  const summary = count === 1 ? (picked.length ? items.find(i => i.key === picked[0])?.label : other?.label) : `${count} documents selected`;
  const row = (key: string, label: string, on: boolean, toggle: () => void) => (
    <div key={key} role="option" aria-selected={on} className={'cc-multi-row' + (on ? ' on' : '')} onClick={toggle}>
      <input type="checkbox" checked={on} readOnly tabIndex={-1} />
      <span>{label}</span>
    </div>
  );
  return (
    <div className="cc-multi" ref={box}>
      <button type="button" className="cc-multi-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className={count ? '' : 'ph'}>{count ? summary : placeholder}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="cc-multi-pop" role="listbox" aria-multiselectable="true">
          {items.map(i => row(i.key, i.label, picked.includes(i.key), () => onToggle(i.key)))}
          {other && row('__other__', other.label, other.on, other.toggle)}
        </div>
      )}
    </div>
  );
}

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
  const [mode, setMode] = useState<'OFF' | 'ADD'>('ADD');
  const [source, setSource] = useState<'POOL' | 'MASTER'>('MASTER');
  /** The documents ticked in the list: `stageCode|code` for the workflow's list, the document code for the master list. Several can be added at once. */
  const [picked, setPicked] = useState<string[]>([]);
  /** "Others" is ticked: a document typed by name is added too. */
  const [otherOn, setOtherOn] = useState(false);
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
    (d: any) => d.source === 'DEFAULT' && !(d.files || []).length,
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
  const stageName = (code: string) => options.stages.find(x => x.code === code)?.name ?? code;
  const sources = [
    ...(options.pool.length ? [{key: 'POOL' as const, label: 'Offered by the workflow'}] : []),
    {key: 'MASTER' as const, label: 'Master data'},
  ];
  const src = sources.some(x => x.key === source) ? source : 'MASTER';
  // "Others" asks for a name; with an empty master list it is the only way to add a document of this kind
  const isOther = src === 'MASTER' && (!options.masters.length || otherOn);
  const typed = isOther ? customName.trim() : '';
  const canAdd = !busy && !!department && (isOther ? !!typed : true) && (picked.length > 0 || !!typed);
  const toggle = (key: string) => setPicked(p => (p.includes(key) ? p.filter(x => x !== key) : [...p, key]));
  const add = async () => {
    const bodies: object[] = [
      ...picked.map(key => {
        if (src === 'POOL') {
          const pool = options.pool.find(x => `${x.stageCode}|${x.code}` === key)!;
          return {action: 'ADD', stageCode: pool.stageCode, workflowDocumentCode: pool.code, departmentCode: department};
        }
        return {action: 'ADD', stageCode: defaultStage, documentCode: key, departmentCode: department};
      }),
      ...(typed ? [{action: 'ADD', stageCode: defaultStage, customName: typed, departmentCode: department, isMandatory: customMandatory}] : []),
    ];
    setBusy(true);
    let added = 0;
    const failed: string[] = [];
    for (const body of bodies) {
      try {
        await post(body);
        added++;
      } catch (e: any) {
        failed.push(e.message || 'Failed');
      }
    }
    try {
      onChange(await api(`/applications/${application.id}`));
      await load();
    } finally {
      setBusy(false);
    }
    notify(failed.length ? `${added} added, ${failed.length} failed: ${failed[0]}` : added === 1 ? 'Document added' : `${added} documents added`);
    // what could not be added stays ticked so it can be tried again; the rest is cleared
    if (!failed.length) {
      setPicked([]);
      setOtherOn(false);
      setCustomName('');
      setCustomMandatory(false);
    }
  };

  return (
    <Modal title="Customize checklist" onClose={onClose} className="cc-modal">
      <div className="cc-body">
        <p className="cc-intro">Changes apply to this application only. Every other application keeps the checklist of its workflow.</p>

        {options.overrides.length > 0 && (
          <section className="cc-list" aria-label="Customised for this application">
            <h4>Customised for this application</h4>
            <ul>
              {options.overrides.map(o => (
                <li key={o.id}>
                  <span className={`wf-badge ${o.action === 'ADD' ? 'active' : 'draft'}`}>{o.action === 'ADD' ? 'Added' : 'Removed'}</span>
                  <span className="cc-doc">
                    <b>{o.name}</b>
                    <small>
                      {stageName(o.stageCode)}
                      {o.reason ? ` · ${o.reason}` : ''}
                    </small>
                  </span>
                  <button type="button" className="button small" disabled={busy} title="Back to the workflow's checklist" onClick={() => run(() => api(`/applications/${application.id}/document-overrides/${o.id}`, 'DELETE'), 'Customization cancelled')}>
                    <Undo2 size={13} /> Undo
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="cc-tabs" role="tablist" aria-label="What do you want to do">
          <button type="button" role="tab" aria-selected={mode === 'ADD'} className={mode === 'ADD' ? 'on' : ''} onClick={() => setMode('ADD')}>
            <FilePlus2 size={15} /> Add a document
          </button>
          <button type="button" role="tab" aria-selected={mode === 'OFF'} className={mode === 'OFF' ? 'on' : ''} onClick={() => setMode('OFF')}>
            <Trash2 size={15} /> Take a default document off
          </button>
        </div>

        {mode === 'OFF' && (
          <section className="cc-form">
            {removable.length === 0 ? (
              <p className="cc-empty">No default document can be taken off. A document that already has a file stays.</p>
            ) : (
              <>
                <label>
                  Document
                  <select value={removeId} onChange={e => setRemoveId(e.target.value)}>
                    <option value="" disabled>
                      Choose a document…
                    </option>
                    {removable.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.documentName} ({stageName(d.stageCode)}){d.isMandatory ? ' · mandatory' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Reason (required)
                  <input placeholder="Why is it not needed for this customer?" value={reason} onChange={e => setReason(e.target.value)} />
                </label>
                <div className="cc-foot">
                  <button
                    type="button"
                    className="button danger"
                    disabled={busy || !removeId || !reason.trim()}
                    onClick={() => {
                      const d = removable.find((x: any) => x.id === removeId);
                      void run(() => post({action: 'REMOVE', stageCode: d.stageCode, workflowDocumentCode: d.documentCode, reason: reason.trim()}), 'Document taken off').then(() => {
                        setRemoveId('');
                        setReason('');
                      });
                    }}
                  >
                    <Trash2 size={14} /> Take off
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {mode === 'ADD' && (
          <section className="cc-form">
            {/* the choice of source is only shown when the workflow offers documents too; with master data alone there is nothing to choose */}
            {sources.length > 1 && (
              <div className="cc-seg" role="tablist" aria-label="Where the document comes from">
                {sources.map(x => (
                  <button key={x.key} type="button" role="tab" aria-selected={src === x.key} className={src === x.key ? 'on' : ''} onClick={() => {
                      setSource(x.key);
                      setPicked([]);
                      setOtherOn(false);
                    }}>
                    {x.label}
                  </button>
                ))}
              </div>
            )}

            {/* several documents can be ticked in the dropdown; each one is added to this application */}
            {(() => {
              const list = src === 'POOL' ? options.pool.map(p => ({key: `${p.stageCode}|${p.code}`, label: `${p.name} (${stageName(p.stageCode)})`})) : options.masters.map(m => ({key: m.code, label: m.name}));
              return list.length > 0 ? (
                <>
                  <div className="cc-field">
                    Document
                    <MultiPick
                      items={list}
                      picked={picked}
                      onToggle={toggle}
                      placeholder={src === 'POOL' ? 'Choose documents…' : 'Choose from master data…'}
                      other={src === 'MASTER' ? {label: 'Others (type a new document name)…', on: otherOn, toggle: () => setOtherOn(v => !v)} : undefined}
                    />
                  </div>
                  {/* what is ticked stays listed while the dropdown is closed; Undo unticks it */}
                  {(picked.length > 0 || (src === 'MASTER' && otherOn)) && (
                    <section className="cc-list" aria-label="Selected documents">
                      <h4>Selected ({picked.length + (src === 'MASTER' && otherOn ? 1 : 0)})</h4>
                      <ul>
                        {picked.map(key => (
                          <li key={key}>
                            <span className="cc-doc">
                              <b>{list.find(d => d.key === key)?.label ?? key}</b>
                            </span>
                            <button type="button" className="button small" disabled={busy} onClick={() => toggle(key)}>
                              <Undo2 size={13} /> Undo
                            </button>
                          </li>
                        ))}
                        {src === 'MASTER' && otherOn && (
                          <li>
                            <span className="cc-doc">
                              <b>{customName.trim() || 'Other document'}</b>
                              <small>Typed by name</small>
                            </span>
                            <button type="button" className="button small" disabled={busy} onClick={() => setOtherOn(false)}>
                              <Undo2 size={13} /> Undo
                            </button>
                          </li>
                        )}
                      </ul>
                    </section>
                  )}
                </>
              ) : null;
            })()}
            {isOther && (
              <label>
                Document name
                <input placeholder="e.g. Surat Keterangan Domisili" value={customName} onChange={e => setCustomName(e.target.value)} />
              </label>
            )}

            <div className="cc-grid">
              {src !== 'POOL' && (
                <label>
                  Stage
                  <select value={defaultStage} onChange={e => setStage(e.target.value)}>
                    {options.stages.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Responsible department
                <select value={department} onChange={e => setDept(e.target.value)}>
                  {options.departments.map(d => (
                    <option key={d.code} value={d.code}>
                      {departmentLabel(d)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="cc-foot">
              {!!typed && (
                <label className="cc-check">
                  <input type="checkbox" checked={customMandatory} onChange={e => setCustomMandatory(e.target.checked)} /> Mandatory
                </label>
              )}
              <button type="button" className="button primary" disabled={!canAdd} onClick={() => void add()}>
                <Plus size={14} /> {picked.length + (typed ? 1 : 0) > 1 ? `Add ${picked.length + (typed ? 1 : 0)} documents` : 'Add to checklist'}
              </button>
            </div>
          </section>
        )}
      </div>
      <div className="modal-actions">
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
