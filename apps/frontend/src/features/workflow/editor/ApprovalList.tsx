/**
 * The approval of ONE place, shown where that place is edited: a whole group, one stage, a section of the stage's form, or one document of
 * a stage. The workflow does not build approvals: it points at ONE master approval (made in Master approval, with its levels and the
 * authority of each level). The same approval can be used in many places. Only a place flagged is_approval in the masters can have one.
 */
import {Check, ChevronDown, Plus, ShieldCheck, Trash2} from 'lucide-react';
import {useState} from 'react';
import {Modal} from '@/shared/ui/Modal';
import {approverLabel, type ApprovalAssignment, type Catalog, type Definition, type MasterApproval} from '../api';

export type ApprovalTarget =
  | {scope: 'GROUP'; groupKey: string}
  | {scope: 'STAGE'; stageKey: string}
  | {scope: 'SECTION'; stageKey: string; sectionCode: string}
  | {scope: 'DOCUMENT'; stageKey: string; documentCode: string};

export const matches = (a: ApprovalAssignment, t: ApprovalTarget) =>
  a.scope === t.scope &&
  (t.scope === 'GROUP'
    ? a.groupKey === t.groupKey
    : t.scope === 'STAGE'
      ? a.stageKey === t.stageKey
      : t.scope === 'SECTION'
        ? a.stageKey === t.stageKey && a.sectionCode === t.sectionCode
        : a.stageKey === t.stageKey && a.documentCode === t.documentCode);

const WORD = {GROUP: 'the whole group', STAGE: 'this stage', SECTION: 'this section', DOCUMENT: 'this document'} as const;

/** The approval a place points at (an empty code = chosen to need one, but not picked yet). */
export const approvalOf = (def: Definition, t: ApprovalTarget) => def.approvals.find(a => matches(a, t));

/** The definition with this place pointing at `approvalCode` (a place has one approval); null removes it. */
export function setApproval(def: Definition, t: ApprovalTarget, approvalCode: string | null): Definition {
  const others = def.approvals.filter(a => !matches(a, t));
  if (approvalCode === null) return {...def, approvals: others};
  const next: ApprovalAssignment = {
    scope: t.scope,
    groupKey: t.scope === 'GROUP' ? t.groupKey : null,
    stageKey: t.scope === 'GROUP' ? null : t.stageKey,
    sectionCode: t.scope === 'SECTION' ? t.sectionCode : null,
    documentCode: t.scope === 'DOCUMENT' ? t.documentCode : null,
    approvalCode,
  };
  return {...def, approvals: [...others, next]};
}

/** The levels of a master approval grouped: the same level number is approved at the same time, the next number starts after it. */
export function levelsOf(approval: MasterApproval) {
  const out: {levelNo: number; authorities: string[]}[] = [];
  for (const l of [...approval.levels].sort((a, b) => a.levelNo - b.levelNo || approverLabel(a).localeCompare(approverLabel(b)))) {
    const last = out[out.length - 1];
    if (last && last.levelNo === l.levelNo) last.authorities.push(approverLabel(l));
    else out.push({levelNo: l.levelNo, authorities: [approverLabel(l)]});
  }
  return out;
}

/** Can this place have an approval? Only the places flagged is_approval in the masters (a group always can). */
export function canHaveApproval(def: Definition, catalog: Catalog, t: ApprovalTarget): boolean {
  if (t.scope === 'GROUP') return true;
  if (t.scope === 'STAGE') {
    const form = def.stages.find(s => s.key === t.stageKey)?.formCode;
    return !form || !!catalog.forms.find(f => f.code === form)?.isApproval;
  }
  if (t.scope === 'SECTION') return !!catalog.sections.find(s => s.code === t.sectionCode)?.isApproval;
  return !!catalog.documents.find(d => d.code === t.documentCode)?.isApproval;
}

/** The steps of an approval: 1, 2, each with the authorities that must approve it. Shown only when asked for. */
function StepsList({approval}: {approval: MasterApproval}) {
  return (
    <ol className="wf-steps">
      {levelsOf(approval).map((layer, i) => (
        <li key={layer.levelNo}>
          <span className="wf-apl-order">{i + 1}</span>
          <div className="wf-apl-chips">
            {layer.authorities.map(a => (
              <span key={a} className="wf-apl-chip">
                {a}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * The approval of ONE place, in the box the workflow editor always had: a header, then a wide dashed "+ Add approval layer" button; once an approval is
 * chosen the box shows its name and steps, with "Change approval" and a trash button that removes it. No switches.
 */
export function ApprovalList({def, setDef, catalog, locked, target, title}: {def: Definition; setDef: (d: Definition) => void; catalog: Catalog; locked: boolean; target: ApprovalTarget; title?: string}) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState(false);
  const mine = approvalOf(def, target);
  const approval = mine?.approvalCode ? catalog.approvals.find(a => a.code === mine.approvalCode) : undefined;
  const eligible = canHaveApproval(def, catalog, target);
  if (locked && !mine) return null;
  if (!eligible && !mine) return null;

  return (
    <div className={`wf-apl ${mine ? 'has' : ''}`}>
      <div className="wf-apl-head">
        <ShieldCheck size={16} />
        <b>{title ?? 'Approval'}</b>
        {!mine && <small>nobody has to approve {WORD[target.scope]}</small>}
      </div>
      {mine && (
        <div className="wf-apl-chosen">
          <button type="button" className="wf-apl-chosen-head" aria-expanded={steps} disabled={!approval} onClick={() => setSteps(!steps)}>
            <b>{approval ? approval.name : mine.approvalCode ? 'This approval no longer exists' : 'Not chosen yet'}</b>
            {approval && (
              <span>
                {levelsOf(approval).length} step{levelsOf(approval).length === 1 ? '' : 's'} <ChevronDown size={14} className={steps ? 'up' : ''} />
              </span>
            )}
          </button>
          {approval && steps && <StepsList approval={approval} />}
        </div>
      )}
      <div style={{display: 'flex', gap: 8, alignItems: 'stretch'}}>
        <button type="button" className="wf-apl-add" style={{flex: 1}} onClick={() => setOpen(true)}>
          {!mine ? (
            <>
              <Plus size={15} /> Add approval layer
            </>
          ) : locked ? (
            'View approval'
          ) : (
            'Change approval'
          )}
        </button>
        {mine && !locked && (
          <button type="button" className="wf-icon-btn danger" aria-label="Remove the approval" title="Remove the approval" onClick={() => setDef(setApproval(def, target, null))}>
            <Trash2 size={18} />
          </button>
        )}
      </div>
      {open && <ApprovalPicker def={def} setDef={setDef} catalog={catalog} locked={locked} target={target} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Choosing the master approval of one place: a list of names; click one to choose it. The steps of an approval open with the small arrow. */
function ApprovalPicker({def, setDef, catalog, locked, target, onClose}: {def: Definition; setDef: (d: Definition) => void; catalog: Catalog; locked: boolean; target: ApprovalTarget; onClose: () => void}) {
  const [q, setQ] = useState('');
  const [shown, setShown] = useState<string | null>(null);
  const mine = approvalOf(def, target);
  const list = catalog.approvals.filter(a => !q.trim() || `${a.name} ${a.levels.map(approverLabel).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase()));
  const pick = (code: string) => {
    if (locked) return;
    setDef(setApproval(def, target, code));
    onClose();
  };
  return (
    <Modal title="Choose an approval" onClose={onClose} className="wf-apl-modal">
      <div className="wf-apl-modal-body">
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search an approval or an authority…" aria-label="Search approvals" autoFocus />
        {!catalog.approvals.length && <p className="wf-apl-warn block">No approval exists yet. Make one in Master Approval first.</p>}
        <ul className="wf-pick">
          {list.map(a => {
            const chosen = mine?.approvalCode === a.code;
            return (
              <li key={a.code} className={chosen ? 'on' : ''}>
                <div className="wf-pick-row">
                  <button type="button" className="wf-pick-main" disabled={locked} onClick={() => pick(a.code)}>
                    <span className="wf-pick-radio" aria-hidden>
                      {chosen && <Check size={12} />}
                    </span>
                    <b>{a.name}</b>
                    <small>
                      {levelsOf(a).length} step{levelsOf(a).length === 1 ? '' : 's'}
                    </small>
                  </button>
                  <button type="button" className="wf-pick-toggle" aria-expanded={shown === a.code} aria-label="Show the steps" title="Show the steps" onClick={() => setShown(shown === a.code ? null : a.code)}>
                    <ChevronDown size={16} className={shown === a.code ? 'up' : ''} />
                  </button>
                </div>
                {shown === a.code && <StepsList approval={a} />}
              </li>
            );
          })}
          {!list.length && <li className="wf-muted">Nothing matches.</li>}
        </ul>
      </div>
    </Modal>
  );
}
