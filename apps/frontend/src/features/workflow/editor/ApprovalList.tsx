/**
 * The approval of ONE thing, shown where that thing is edited: a whole group, one stage, or one document of a stage. A step has an order
 * (the same order is approved at the same time, the next order starts when they are all approved) and ONE authority, chosen from the
 * authorities made for the place being edited (one per department, from crm_workflow_authority_options). Whoever holds it can approve or reject. A small table under the choice says what
 * the authority is for, so nobody has to decode its name.
 */
import {parseApprovalAuthority, toCode} from '@liugong/shared';
import {AlertTriangle, ArrowDown, Plus, ShieldCheck, Trash2, Users} from 'lucide-react';
import {useState} from 'react';
import {Modal} from '@/shared/ui/Modal';
import type {ApprovalStep, Catalog, Definition} from '../api';
import {tempKey} from '../definition-ops';

export type ApprovalTarget =
  | {scope: 'GROUP'; groupKey: string}
  | {scope: 'STAGE'; stageKey: string}
  | {scope: 'DOCUMENT'; stageKey: string; documentCode: string};

const matches = (a: ApprovalStep, t: ApprovalTarget) =>
  a.scope === t.scope && (t.scope === 'GROUP' ? a.groupKey === t.groupKey : t.scope === 'STAGE' ? a.stageKey === t.stageKey : a.stageKey === t.stageKey && a.documentCode === t.documentCode);

const codeOf = (item?: {code?: string | null; name: string}) => (item ? String(item.code || '').trim() || toCode(item.name) : '');

const WORD = {GROUP: 'the whole group', STAGE: 'this stage', DOCUMENT: 'this document'} as const;

/** The definition with one more approval step for this target (no authority chosen yet), in the given layer (order). */
export function addApprovalStep(def: Definition, target: ApprovalTarget, order?: number): Definition {
  const mine = def.approvalSteps.filter(a => matches(a, target));
  const names = new Set(def.approvalSteps.map(a => toCode(a.name)));
  let n = def.approvalSteps.length + 1;
  while (names.has(toCode(`Approval ${n}`))) n++;
  return {
    ...def,
    approvalSteps: [
      ...def.approvalSteps,
      {
        key: tempKey('a'),
        name: `Approval ${n}`,
        scope: target.scope,
        groupKey: target.scope === 'GROUP' ? target.groupKey : null,
        stageKey: target.scope === 'GROUP' ? null : target.stageKey,
        documentCode: target.scope === 'DOCUMENT' ? target.documentCode : null,
        order: order ?? (mine.length ? Math.max(...mine.map(a => a.order)) + 1 : 1),
        authorityName: '',
      },
    ],
  };
}

/** The steps of one place grouped into layers: the same order is one layer (approved at the same time), the next order starts after it. */
function layersOf(steps: ApprovalStep[]): ApprovalStep[][] {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const layers: ApprovalStep[][] = [];
  sorted.forEach((s, i) => {
    if (i > 0 && s.order === sorted[i - 1].order) layers[layers.length - 1].push(s);
    else layers.push([s]);
  });
  return layers;
}

export function ApprovalList({def, setDef, catalog, locked, target, title}: {def: Definition; setDef: (d: Definition) => void; catalog: Catalog; locked: boolean; target: ApprovalTarget; title?: string}) {
  const [open, setOpen] = useState(false);
  const mine = def.approvalSteps.filter(a => matches(a, target));
  const layers = layersOf(mine);
  const deptOf = (step: ApprovalStep) => {
    const code = catalog.authorityOptions.find(o => o.authorityName === step.authorityName)?.departmentCode ?? parseApprovalAuthority(step.authorityName)?.departmentCode ?? '';
    return code ? (catalog.departments.find(d => d.code === code)?.name ?? code) : '';
  };
  if (locked && !mine.length) return null;

  return (
    <div className={`wf-apl ${mine.length ? 'has' : ''}`}>
      <div className="wf-apl-head">
        <ShieldCheck size={16} />
        <b>{title ?? 'Approval'}</b>
        {!mine.length && <small>nobody has to approve {WORD[target.scope]}</small>}
      </div>
      {layers.length > 0 && (
        <ol className="wf-apl-flow">
          {layers.map((layer, i) => (
            <li key={i}>
              <span className="wf-apl-order">{i + 1}</span>
              <div className="wf-apl-flow-body">
                <small>
                  {i === 0 ? 'First' : `Then, after step ${i} is approved`}
                  {layer.length > 1 ? ` · all ${layer.length} at the same time` : ''}
                </small>
                <div className="wf-apl-chips">
                  {layer.map(s => (
                    <span key={s.key} className={`wf-apl-chip ${deptOf(s) ? '' : 'missing'}`}>
                      {deptOf(s) || 'Not chosen yet'}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <button type="button" className="wf-apl-add" onClick={() => setOpen(true)}>
        {locked ? (
          'View approval'
        ) : mine.length ? (
          'Edit approval'
        ) : (
          <>
            <Plus size={15} /> Set up approval
          </>
        )}
      </button>
      {open && <ApprovalModal def={def} setDef={setDef} catalog={catalog} locked={locked} target={target} title={title ?? 'Approval'} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Setting up the approval of one place: choose Parallel or Sequential first, then choose who approves in each layer. */
function ApprovalModal({def, setDef, catalog, locked, target, title, onClose}: {def: Definition; setDef: (d: Definition) => void; catalog: Catalog; locked: boolean; target: ApprovalTarget; title: string; onClose: () => void}) {
  const mine = def.approvalSteps.filter(a => matches(a, target));
  const layers = layersOf(mine);
  const placeForm = target.scope === 'STAGE' ? (def.stages.find(x => x.key === target.stageKey)?.formCode ?? null) : null;
  const authorities = (catalog.authorityOptions ?? []).filter(
    o => o.scope === target.scope && (target.scope === 'GROUP' || (target.scope === 'STAGE' ? !!placeForm && o.formCode === placeForm : o.documentCode === target.documentCode)),
  );
  const deptName = (code: string) => {
    const name = catalog.departments.find(d => d.code === code)?.name;
    return name && name !== code ? `${name} (${code})` : code;
  };
  const placeName =
    target.scope === 'GROUP'
      ? (def.groups.find(g => g.key === target.groupKey)?.name ?? 'Group')
      : target.scope === 'STAGE'
        ? (def.stages.find(x => x.key === target.stageKey)?.name ?? 'Stage')
        : (catalog.documents.find(d => d.code === target.documentCode)?.name ?? target.documentCode);

  /** Put this place's steps back in layers: every layer is one order (1, 2, 3...), so the numbers never have to be edited by hand. */
  const commit = (next: ApprovalStep[][]) =>
    setDef({
      ...def,
      approvalSteps: [...def.approvalSteps.filter(a => !matches(a, target)), ...next.flatMap((layer, i) => layer.map(s => ({...s, order: i + 1})))],
    });
  const blank = (taken: ApprovalStep[]): ApprovalStep => {
    const names = new Set([...def.approvalSteps, ...taken].map(a => toCode(a.name)));
    let n = def.approvalSteps.length + taken.length + 1;
    while (names.has(toCode(`Approval ${n}`))) n++;
    return {
      key: tempKey('a'),
      name: `Approval ${n}`,
      scope: target.scope,
      groupKey: target.scope === 'GROUP' ? target.groupKey : null,
      stageKey: target.scope === 'GROUP' ? null : target.stageKey,
      documentCode: target.scope === 'DOCUMENT' ? target.documentCode : null,
      order: 0,
      authorityName: '',
    };
  };
  const addLayer = (count: number) => {
    const made: ApprovalStep[] = [];
    for (let i = 0; i < count; i++) made.push(blank([...mine, ...made]));
    commit([...layers, made]);
  };
  const addToLayer = (li: number) => commit(layers.map((l, i) => (i === li ? [...l, blank(mine)] : l)));
  const removeStep = (key: string) => commit(layers.map(l => l.filter(s => s.key !== key)).filter(l => l.length));
  const choose = (key: string, authorityName: string) => {
    const dept = authorities.find(o => o.authorityName === authorityName)?.departmentCode;
    const base = dept ? `${placeName} - ${catalog.departments.find(d => d.code === dept)?.name ?? dept}` : '';
    const taken = new Set(def.approvalSteps.filter(a => a.key !== key).map(a => toCode(a.name)));
    let name = base;
    for (let n = 2; name && taken.has(toCode(name)); n++) name = `${base} ${n}`;
    setDef({...def, approvalSteps: def.approvalSteps.map(a => (a.key === key ? {...a, authorityName, ...(name ? {name} : {})} : a))});
  };
  const cannot = !authorities.length;

  return (
    <Modal title={`${title}: ${placeName}`} onClose={onClose} className="wf-apl-modal">
      <div className="wf-apl-modal-body">
        {!layers.length && (
          <div className="wf-apl-empty">
            <h3>Nobody has to approve yet</h3>
            {!locked && (
              <button type="button" className="wf-btn primary" disabled={cannot} onClick={() => addLayer(1)}>
                <Plus size={16} /> Add the first approver
              </button>
            )}
          </div>
        )}

        {cannot && !locked && (
          <p className="wf-apl-warn block">
            <AlertTriangle size={14} />
            {target.scope === 'STAGE' && !placeForm ? ' Choose a Form for this stage first: the approvers depend on the form.' : ' No authority is made for this yet. Ask the User Management administrator to create one and list it for this place.'}
          </p>
        )}

        {layers.map((layer, li) => (
          <section className="wf-apl-layer" key={layer[0].key}>
            <header>
              <span className="wf-apl-order">{li + 1}</span>
              <b>{li === 0 ? 'First' : 'Then'}</b>
              <small>{layer.length > 1 ? `all ${layer.length} approve at the same time` : 'one approver'}</small>
            </header>
            {layer.map(a => {
              const listed = authorities.some(x => x.authorityName === a.authorityName);
              return (
                <div className="wf-apl-row" key={a.key}>
                  <select value={a.authorityName} disabled={locked} onChange={e => choose(a.key, e.target.value)} aria-label="Who approves">
                    <option value="">Who approves? Choose a department…</option>
                    {!listed && a.authorityName && <option value={a.authorityName}>{a.authorityName}</option>}
                    {authorities.map(x => (
                      <option key={x.authorityName} value={x.authorityName}>
                        {deptName(x.departmentCode)}
                      </option>
                    ))}
                  </select>
                  {!locked && (
                    <button type="button" className="wf-icon-btn danger" title="Remove this approver" onClick={() => removeStep(a.key)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                  {a.authorityName && a.authorityExists === false && (
                    <p className="wf-apl-warn block">
                      <AlertTriangle size={14} /> This authority no longer exists in User Management.
                    </p>
                  )}
                </div>
              );
            })}
            {!locked && (
              <button type="button" className="wf-apl-more" onClick={() => addToLayer(li)} disabled={cannot}>
                <Users size={14} /> Add another approver at the same time
              </button>
            )}
          </section>
        ))}

        {layers.length > 0 && !locked && (
          <div className="wf-apl-next">
            <button type="button" className="wf-apl-add" onClick={() => addLayer(1)} disabled={cannot}>
              <ArrowDown size={14} /> Add an approver after the layer above
            </button>
          </div>
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
