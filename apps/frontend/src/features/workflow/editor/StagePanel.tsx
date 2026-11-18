/** The side panel of one stage: which form it shows, which fields are required, and which documents it has. */
import {Plus, Search, Trash2, X} from 'lucide-react';
import {useMemo, useState} from 'react';
import type {Catalog, Definition, Stage} from '../api';

type Props = {
  def: Definition;
  setDef: (d: Definition) => void;
  catalog: Catalog;
  stage: Stage;
  locked: boolean;
  initialTab?: 'fields' | 'documents';
  onClose: () => void;
};

export function StagePanel({def, setDef, catalog, stage, locked, initialTab = 'fields', onClose}: Props) {
  const [tab, setTab] = useState<'fields' | 'documents'>(initialTab);
  const [search, setSearch] = useState('');
  const [pick, setPick] = useState('');
  const form = stage.formCode || '';
  const formName = catalog.forms.find(f => f.code === form)?.name;

  const sections = useMemo(() => {
    const map = new Map<string, Catalog['formFields']>();
    for (const f of catalog.formFields.filter(x => x.formCode === form)) map.set(f.section, [...(map.get(f.section) || []), f]);
    return [...map.entries()];
  }, [catalog, form]);

  const isMandatory = (section: string, code: string) =>
    !!def.fields.find(f => f.stageKey === stage.key && f.formCode === form && f.section === section && f.code === code)?.mandatory;

  function setMandatory(section: string, codes: string[], value: boolean) {
    let fields = def.fields.filter(f => !(f.stageKey === stage.key && f.formCode === form && f.section === section && codes.includes(f.code)));
    if (value) fields = [...fields, ...codes.map(code => ({stageKey: stage.key, formCode: form, section, code, mandatory: true}))];
    setDef({...def, fields});
  }

  const requiredCount = def.fields.filter(f => f.stageKey === stage.key && f.mandatory).length;
  const docs = def.documents.filter(d => d.stageKey === stage.key);
  const free = catalog.documents.filter(d => !docs.some(r => r.documentCode === d.code));
  const docName = (code: string) => catalog.documents.find(d => d.code === code)?.name ?? code;
  const patchDoc = (code: string, patch: Partial<Definition['documents'][number]>) =>
    setDef({...def, documents: def.documents.map(d => (d.stageKey === stage.key && d.documentCode === code ? {...d, ...patch} : d))});
  const q = search.trim().toLowerCase();

  return (
    <div className="wf-scrim" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <aside className="wf-panel" role="dialog" aria-label={`Set up ${stage.name}`}>
        <header className="wf-panel-head">
          <div>
            <span className="wf-eyebrow">Stage</span>
            <h3>{stage.name || 'Untitled stage'}</h3>
          </div>
          <button className="wf-icon-btn" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </header>

        <div className="wf-seg" role="tablist">
          <button role="tab" aria-selected={tab === 'fields'} className={tab === 'fields' ? 'on' : ''} onClick={() => setTab('fields')}>
            Required fields <span>{requiredCount}</span>
          </button>
          <button role="tab" aria-selected={tab === 'documents'} className={tab === 'documents' ? 'on' : ''} onClick={() => setTab('documents')}>
            Documents <span>{docs.length}</span>
          </button>
        </div>

        <div className="wf-panel-body">
          {tab === 'fields' && (
            <>
              {!form && (
                <div className="wf-note">
                  This stage shows no form, so there are no fields to require. Choose a form on the stage card first.
                </div>
              )}
              {form && (
                <>
                  <p className="wf-lead">
                    Tick the fields of the <b>{formName || form}</b> that must be filled in before this stage can be submitted. In a list (deeds,
                    shareholders, units) a tick applies to every item.
                  </p>
                  <label className="wf-search">
                    <Search size={18} />
                    <input placeholder="Search a field or section" value={search} onChange={e => setSearch(e.target.value)} />
                  </label>
                  {sections.map(([section, fields]) => {
                    const shown = fields.filter(f => !q || `${f.label} ${section}`.toLowerCase().includes(q));
                    if (!shown.length) return null;
                    const tickable = fields.filter(f => f.enforceable);
                    const ticked = tickable.filter(f => isMandatory(section, f.code)).length;
                    return (
                      <details key={section} className="wf-section" open={!!q || undefined}>
                        <summary>
                          <span className="wf-section-name">{section}</span>
                          <span className="wf-section-count">
                            {ticked} of {tickable.length} required
                          </span>
                          {!locked && tickable.length > 0 && (
                            <label className="wf-all" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={ticked === tickable.length}
                                ref={el => {
                                  if (el) el.indeterminate = ticked > 0 && ticked < tickable.length;
                                }}
                                onChange={e =>
                                  setMandatory(
                                    section,
                                    tickable.map(f => f.code),
                                    e.target.checked,
                                  )
                                }
                              />
                              All
                            </label>
                          )}
                        </summary>
                        <div className="wf-field-grid">
                          {shown.map(f => (
                            <label key={f.code} className={`wf-field ${isMandatory(section, f.code) ? 'on' : ''} ${f.enforceable ? '' : 'off'}`} title={f.enforceable ? undefined : 'The system cannot check this field yet'}>
                              <input
                                type="checkbox"
                                disabled={locked || !f.enforceable}
                                checked={isMandatory(section, f.code)}
                                onChange={e => setMandatory(section, [f.code], e.target.checked)}
                              />
                              <span>{f.label}</span>
                            </label>
                          ))}
                        </div>
                      </details>
                    );
                  })}
                </>
              )}
            </>
          )}

          {tab === 'documents' && (
            <>
              <p className="wf-lead">
                <b>Default</b> documents are on the checklist of every application. Others are only offered: a user can add one to a single application.{' '}
                <b>Mandatory</b> documents need a file before the stage can be submitted.
              </p>
              <div className="wf-doc-list">
                {docs.map(d => (
                  <div className="wf-doc" key={d.documentCode}>
                    <div className="wf-doc-name">
                      <b>{docName(d.documentCode)}</b>
                    </div>
                    <label className="wf-switch">
                      <input type="checkbox" disabled={locked} checked={d.isDefault} onChange={e => patchDoc(d.documentCode, {isDefault: e.target.checked})} />
                      <i /> Default
                    </label>
                    <label className="wf-switch">
                      <input type="checkbox" disabled={locked} checked={d.isMandatory} onChange={e => patchDoc(d.documentCode, {isMandatory: e.target.checked})} />
                      <i /> Mandatory
                    </label>
                    {!locked && (
                      <button className="wf-icon-btn danger" title="Remove document" onClick={() => setDef({...def, documents: def.documents.filter(x => !(x.stageKey === stage.key && x.documentCode === d.documentCode))})}>
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                {!docs.length && <div className="wf-note">No document in this stage yet.</div>}
              </div>
              {!locked && free.length > 0 && (
                <div className="wf-add-doc">
                  <select value={pick} onChange={e => setPick(e.target.value)}>
                    <option value="">Add a document…</option>
                    {free.map(d => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="wf-btn primary"
                    disabled={!pick}
                    onClick={() => {
                      const doc = catalog.documents.find(d => d.code === pick);
                      if (!doc) return;
                      setDef({...def, documents: [...def.documents, {stageKey: stage.key, documentCode: doc.code, isDefault: true, isMandatory: false}]});
                      setPick('');
                    }}
                  >
                    <Plus size={18} /> Add
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
