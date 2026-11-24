/** The side panel of one stage, in tabs: its details (name, order, department, form), the required fields, the documents and the approval. */
export type StageTab = 'details' | 'fields' | 'documents' | 'approval';
import {Plus, Search, Trash2, X} from 'lucide-react';
import {departmentLabel} from '@/shared/lib/departments';
import {useMemo, useState, Fragment} from 'react';
import type {Catalog, Definition, Stage} from '../api';
import {ApprovalList, approvalOf} from './ApprovalList';

type Props = {
  def: Definition;
  setDef: (d: Definition) => void;
  catalog: Catalog;
  stage: Stage;
  locked: boolean;
  initialTab?: StageTab;
  onClose: () => void;
};

/** What separates the sub-section of a form from the label of its field in the master: "Financial Lease | Currency". */
const SUB = ' | ';

/**
 * The sub-sections of a form section, as the form shows them: a field label written "Sub-section | Label" belongs to the sub-section named before
 * the separator (neighbouring fields with the same name are one sub-section). A field without one is shown with its whole label; when it follows a
 * sub-section it is set apart by a rule (`afterGroup`), so it does not look like part of the sub-section above it. The order is the master's.
 */
function subsectionsOf<T extends {label: string}>(fields: T[]): {title: string | null; fields: T[]; afterGroup: boolean}[] {
  const parts: {title: string | null; fields: T[]; afterGroup: boolean}[] = [];
  for (const f of fields) {
    const i = f.label.indexOf(SUB);
    const title = i > 0 ? f.label.slice(0, i) : null;
    const last = parts[parts.length - 1];
    if (last && last.title === title) last.fields.push(f);
    else parts.push({title, fields: [f], afterGroup: title === null && !!last && last.title !== null});
  }
  return parts;
}

export function StagePanel({def, setDef, catalog, stage, locked, initialTab = 'details', onClose}: Props) {
  const [tab, setTab] = useState<StageTab>(initialTab);
  const [search, setSearch] = useState('');
  const [picks, setPicks] = useState<string[]>([]);
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
  // A document belongs to one stage of a workflow (the checklist of an application is one list): one already used by another stage is shown apart, greyed, with where it is used.
  const usedElsewhere = new Map<string, string[]>();
  for (const d of def.documents)
    if (d.stageKey !== stage.key) usedElsewhere.set(d.documentCode, [...new Set([...(usedElsewhere.get(d.documentCode) || []), def.stages.find(s => s.key === d.stageKey)?.name ?? d.stageKey])]);
  const notHere = catalog.documents.filter(d => !docs.some(r => r.documentCode === d.code));
  const free = notHere.filter(d => !usedElsewhere.has(d.code));
  const taken = notHere.filter(d => usedElsewhere.has(d.code));
  const docName = (code: string) => catalog.documents.find(d => d.code === code)?.name ?? code;
  const patchDoc = (code: string, patch: Partial<Definition['documents'][number]>) =>
    setDef({...def, documents: def.documents.map(d => (d.stageKey === stage.key && d.documentCode === code ? {...d, ...patch} : d))});
  const q = search.trim().toLowerCase();
  const patchStage = (p: Partial<Stage>) => setDef({...def, stages: def.stages.map(x => (x.key === stage.key ? {...x, ...p} : x))});
  const approvalCount = def.approvals.filter(a => a.stageKey === stage.key).length;

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
          <button role="tab" aria-selected={tab === 'details'} className={tab === 'details' ? 'on' : ''} onClick={() => setTab('details')}>
            Details
          </button>
          <button role="tab" aria-selected={tab === 'fields'} className={tab === 'fields' ? 'on' : ''} onClick={() => setTab('fields')}>
            Fields <span>{requiredCount}</span>
          </button>
          <button role="tab" aria-selected={tab === 'documents'} className={tab === 'documents' ? 'on' : ''} onClick={() => setTab('documents')}>
            Documents <span>{docs.length}</span>
          </button>
          <button role="tab" aria-selected={tab === 'approval'} className={tab === 'approval' ? 'on' : ''} onClick={() => setTab('approval')}>
            Approval <span>{approvalCount}</span>
          </button>
        </div>

        <div className="wf-panel-body">
          {tab === 'details' && (
            <div className="wf-details">
              <label>
                <span>Stage name</span>
                <input disabled={locked} value={stage.name} onChange={e => patchStage({name: e.target.value})} />
              </label>
              <label>
                <span>Department who works on this stage *</span>
                <select disabled={locked} className={stage.departmentCode ? '' : 'wf-missing'} value={stage.departmentCode || ''} onChange={e => patchStage({departmentCode: e.target.value || null})}>
                  {!stage.departmentCode && <option value="" disabled hidden>Choose a department…</option>}
                  {catalog.departments.map(d => (
                    <option key={d.code} value={d.code}>
                      {departmentLabel(d)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Form shown in this stage</span>
                <select disabled={locked} value={stage.formCode || ''} onChange={e => patchStage({formCode: e.target.value || null})}>
                  <option value="">No form</option>
                  {catalog.forms.map(f => (
                    <option key={f.code} value={f.code}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {tab === 'approval' && (
            <>
              <ApprovalList def={def} setDef={setDef} catalog={catalog} locked={locked} target={{scope: 'STAGE', stageKey: stage.key}} title="Approval of this stage" />
              {catalog.sections
                .filter(x => !!stage.formCode && x.formCode === stage.formCode && x.isApproval)
                .map(x => (
                  <ApprovalList
                    key={x.code}
                    def={def}
                    setDef={setDef}
                    catalog={catalog}
                    locked={locked}
                    target={{scope: 'SECTION', stageKey: stage.key, sectionCode: x.code}}
                    title={`Approval of the section ${x.name}${x.isRepeating ? ' (once per row)' : ''}`}
                  />
                ))}
              {/* the documents of this stage that may have an approval: all in one place */}
              {docs
                .filter(d => !!catalog.documents.find(x => x.code === d.documentCode)?.isApproval)
                .map(d => (
                  <ApprovalList
                    key={d.documentCode}
                    def={def}
                    setDef={setDef}
                    catalog={catalog}
                    locked={locked}
                    target={{scope: 'DOCUMENT', stageKey: stage.key, documentCode: d.documentCode}}
                    title={`Approval of the document ${docName(d.documentCode)}`}
                  />
                ))}
            </>
          )}

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
                    Tick what must be filled in on the <b>{formName || form}</b> before this stage can be submitted.
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
                    // A section flagged is_approval in the masters can carry an approval right here (the same one as in the Approval tab).
                    const sectionCode = fields[0]?.sectionCode;
                    const approvalSection = sectionCode ? catalog.sections.find(x => x.code === sectionCode && x.formCode === form && x.isApproval) : undefined;
                    const sectionTarget = approvalSection ? ({scope: 'SECTION', stageKey: stage.key, sectionCode: approvalSection.code} as const) : null;
                    const sectionApproval = sectionTarget ? approvalOf(def, sectionTarget) : undefined;
                    return (
                      <details key={section} className="wf-section" open={!!q || undefined}>
                        <summary>
                          <span className="wf-section-name">{section}</span>
                          {approvalSection && (
                            <span className="wf-section-count" title="This section can carry an approval">
                              {sectionApproval ? `Approval: ${catalog.approvals.find(a => a.code === sectionApproval.approvalCode)?.name || sectionApproval.approvalCode || 'not chosen yet'}` : 'Approval: none'}
                            </span>
                          )}
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
                        {sectionTarget && approvalSection && (
                          <ApprovalList
                            def={def}
                            setDef={setDef}
                            catalog={catalog}
                            locked={locked}
                            target={sectionTarget}
                            title={`Approval of this section${approvalSection.isRepeating ? ' (once per row)' : ''}`}
                          />
                        )}
                        <div className="wf-field-grid">
                          {subsectionsOf(shown).map(part => (
                            <Fragment key={part.title ?? part.fields[0].code}>
                              {part.title && <div className="wf-sub">{part.title}</div>}
                              {part.afterGroup && <div className="wf-sub-rule" />}
                              {part.fields.map(f => (
                                <label key={f.code} className={`wf-field ${isMandatory(section, f.code) ? 'on' : ''} ${f.enforceable ? '' : 'off'}`} title={f.enforceable ? undefined : 'The system cannot check this field yet'}>
                                  <input
                                    type="checkbox"
                                    disabled={locked || !f.enforceable}
                                    checked={isMandatory(section, f.code)}
                                    onChange={e => setMandatory(section, [f.code], e.target.checked)}
                                  />
                                  <span>{part.title ? f.label.slice(part.title.length + SUB.length) : f.label}</span>
                                </label>
                              ))}
                            </Fragment>
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
              <div className="wf-doc-list">
                {docs.map(d => (
                  <div className="wf-doc-block" key={d.documentCode}>
                  <div className="wf-doc">
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
                  {(() => {
                    const target = {scope: 'DOCUMENT' as const, stageKey: stage.key, documentCode: d.documentCode};
                    const flagged = !!catalog.documents.find(x => x.code === d.documentCode)?.isApproval;
                    return (
                      <>
                        {flagged && <ApprovalList def={def} setDef={setDef} catalog={catalog} locked={locked} target={target} />}
                      </>
                    );
                  })()}
                  </div>
                ))}
                {!docs.length && <div className="wf-note">No document in this stage yet.</div>}
              </div>
              {!locked && (free.length > 0 || taken.length > 0) && (
                <div className="wf-add-doc" style={{display: 'grid', gap: 10}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'}}>
                    <b>Add documents</b>
                    <small className="wf-muted">Tick every document this stage needs, then add them together.</small>
                    <label className="wf-all" style={{marginLeft: 'auto'}}>
                      <input
                        type="checkbox"
                        checked={picks.length === free.length}
                        ref={el => {
                          if (el) el.indeterminate = picks.length > 0 && picks.length < free.length;
                        }}
                        onChange={e => setPicks(e.target.checked ? free.map(d => d.code) : [])}
                      />
                      All
                    </label>
                  </div>
                  <div className="wf-field-grid">
                    {free.map(d => (
                      <label key={d.code} className={`wf-field ${picks.includes(d.code) ? 'on' : ''}`}>
                        <input type="checkbox" checked={picks.includes(d.code)} onChange={e => setPicks(e.target.checked ? [...picks, d.code] : picks.filter(c => c !== d.code))} />
                        <span>{d.name}</span>
                      </label>
                    ))}
                  </div>
                  {taken.length > 0 && (
                    <>
                      <small className="wf-muted">Already used by another stage (a document belongs to one stage):</small>
                      <div className="wf-field-grid">
                        {taken.map(d => (
                          <label key={d.code} className="wf-field taken" title="Remove it from that stage first to use it here">
                            <input type="checkbox" disabled checked={false} readOnly />
                            <span>{d.name}</span>
                            <em className="wf-taken-tag">Used in {usedElsewhere.get(d.code)!.join(', ')}</em>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                  <button
                    className="wf-btn primary"
                    disabled={!picks.length}
                    onClick={() => {
                      const chosen = free.filter(d => picks.includes(d.code));
                      if (!chosen.length) return;
                      setDef({...def, documents: [...def.documents, ...chosen.map(d => ({stageKey: stage.key, documentCode: d.code, isDefault: true, isMandatory: false}))]});
                      setPicks([]);
                    }}
                  >
                    <Plus size={18} /> {picks.length ? `Add ${picks.length} document${picks.length === 1 ? '' : 's'}` : 'Add documents'}
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
