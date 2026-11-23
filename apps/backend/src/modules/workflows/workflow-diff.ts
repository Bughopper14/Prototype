/** What changed between two versions of a workflow (both read from the frozen tables, see WorkflowsService.version). */

export interface VersionContent {
  freeze: {name: string};
  groups: {code: string; name: string; order?: number}[];
  stages: {code: string; groupCode: string; name: string; departmentCode: string | null; formCode: string | null; order?: number}[];
  fields: {stageCode: string; code: string; label: string; mandatory: boolean; formCode?: string; section?: string}[];
  documents: {stageCode: string; code: string; name: string; isDefault: boolean; isMandatory: boolean}[];
  approvals: {scope: string; groupCode: string | null; stageCode: string | null; sectionCode: string | null; documentCode: string | null; approvalCode: string; approvalName: string; levels: string; approvalVersion?: number | null; levelList?: {levelNo: number; authorityName: string; isPicMarketing: boolean}[]}[];
}

export interface Change {
  kind: 'added' | 'removed' | 'changed';
  area: 'Workflow' | 'Group' | 'Stage' | 'Field' | 'Document' | 'Approval';
  label: string;
  detail?: string;
}

/** Compares items by a key: what is only in `now` is added, only in `before` is removed, in both with another value is changed. */
function compare<T>(area: Change['area'], before: T[], now: T[], key: (t: T) => string, label: (t: T) => string, same: (a: T, b: T) => string | null): Change[] {
  const old = new Map(before.map(t => [key(t), t]));
  const cur = new Map(now.map(t => [key(t), t]));
  const out: Change[] = [];
  for (const [k, t] of cur) {
    const o = old.get(k);
    if (!o) out.push({kind: 'added', area, label: label(t)});
    else {
      const d = same(o, t);
      if (d) out.push({kind: 'changed', area, label: label(t), detail: d});
    }
  }
  for (const [k, t] of old) if (!cur.has(k)) out.push({kind: 'removed', area, label: label(t)});
  return out;
}

const diffs = (pairs: [string, unknown, unknown][]) => {
  const parts = pairs.filter(([, a, b]) => a !== b).map(([n, a, b]) => `${n}: ${a ?? '-'} → ${b ?? '-'}`);
  return parts.length ? parts.join('; ') : null;
};

export function diffVersions(before: VersionContent, now: VersionContent): Change[] {
  const out: Change[] = [];
  if (before.freeze.name !== now.freeze.name) out.push({kind: 'changed', area: 'Workflow', label: 'Name', detail: `${before.freeze.name} → ${now.freeze.name}`});
  out.push(...compare('Group', before.groups, now.groups, g => g.code, g => g.name, (a, b) => diffs([['name', a.name, b.name]])));
  out.push(
    ...compare('Stage', before.stages, now.stages, s => s.code, s => s.name, (a, b) =>
      diffs([['name', a.name, b.name], ['group', a.groupCode, b.groupCode], ['department', a.departmentCode, b.departmentCode], ['form', a.formCode, b.formCode]]),
    ),
  );
  out.push(
    ...compare('Field', before.fields, now.fields, f => `${f.stageCode}|${f.code}`, f => `${f.label} (${f.stageCode})`, (a, b) =>
      diffs([['required', a.mandatory ? 'yes' : 'no', b.mandatory ? 'yes' : 'no']]),
    ),
  );
  out.push(
    ...compare('Document', before.documents, now.documents, d => `${d.stageCode}|${d.code}`, d => `${d.name} (${d.stageCode})`, (a, b) =>
      diffs([['required', a.isMandatory ? 'yes' : 'no', b.isMandatory ? 'yes' : 'no'], ['default', a.isDefault ? 'yes' : 'no', b.isDefault ? 'yes' : 'no']]),
    ),
  );
  const where = (a: VersionContent['approvals'][number]) => [a.scope, a.groupCode, a.stageCode, a.sectionCode, a.documentCode].filter(Boolean).join(' ');
  out.push(
    ...compare('Approval', before.approvals, now.approvals, a => [a.scope, a.groupCode, a.stageCode, a.sectionCode, a.documentCode].join('|'), a => `${a.approvalName} (${where(a)})`, (a, b) =>
      diffs([['approval', a.approvalCode, b.approvalCode], ['levels', a.levels, b.levels]]),
    ),
  );
  return out;
}

export const summarize = (changes: Change[] | null) =>
  changes ? {added: changes.filter(c => c.kind === 'added').length, removed: changes.filter(c => c.kind === 'removed').length, changed: changes.filter(c => c.kind === 'changed').length} : null;

export interface ApprovalContent {
  name: string;
  approvalType: string;
  description: string | null;
  levels: {levelNo: number; label: string}[];
}

/** What changed between two versions of a master approval (its header text and its levels). */
export function diffApprovals(before: ApprovalContent, now: ApprovalContent): Change[] {
  const out: Change[] = [];
  const head = (n: string, a: unknown, b: unknown) => a !== b && out.push({kind: 'changed', area: 'Approval', label: n, detail: `${a ?? '-'} → ${b ?? '-'}`});
  head('Name', before.name, now.name);
  head('Type', before.approvalType, now.approvalType);
  head('Description', before.description, now.description);
  const key = (l: {levelNo: number; label: string}) => `${l.levelNo}|${l.label}`;
  const old = new Set(before.levels.map(key));
  const cur = new Set(now.levels.map(key));
  for (const l of now.levels) if (!old.has(key(l))) out.push({kind: 'added', area: 'Approval', label: `Level ${l.levelNo}: ${l.label}`});
  for (const l of before.levels) if (!cur.has(key(l))) out.push({kind: 'removed', area: 'Approval', label: `Level ${l.levelNo}: ${l.label}`});
  return out;
}
