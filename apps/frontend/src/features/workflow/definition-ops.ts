import type {Definition, Group, Stage} from './api';

/** A temporary key for a new group or stage (the backend builds the real code from the name when it is saved). */
export const tempKey = (prefix: string) => `new-${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export const sortGroups = (groups: Group[]) => [...groups].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
export const sortStages = (stages: Stage[]) => [...stages].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

/** Groups collected by step: groups with the same order are one step and run together. */
export function stepsOf(def: Definition): {order: number; groups: Group[]}[] {
  const steps: {order: number; groups: Group[]}[] = [];
  for (const g of sortGroups(def.groups)) {
    const step = steps.find(s => s.order === g.order);
    if (step) step.groups.push(g);
    else steps.push({order: g.order, groups: [g]});
  }
  return steps;
}

/** Removing a part also removes what hangs on it (a group takes its stages, a stage its fields and documents). */
export function removePart(def: Definition, kind: 'group' | 'stage', key: string): Definition {
  if (kind === 'group') {
    let next: Definition = {...def, groups: def.groups.filter(g => g.key !== key), approvalSteps: def.approvalSteps.filter(a => !(a.scope === 'GROUP' && a.groupKey === key))};
    for (const s of def.stages.filter(x => x.groupKey === key)) next = removePart(next, 'stage', s.key);
    return next;
  }
  return {
    ...def,
    stages: def.stages.filter(s => s.key !== key),
    fields: def.fields.filter(f => f.stageKey !== key),
    documents: def.documents.filter(d => d.stageKey !== key),
    approvalSteps: def.approvalSteps.filter(a => a.stageKey !== key),
  };
}

/** A group moved one step earlier or later; the steps are renumbered 1, 2, 3... so there are no gaps. */
export function moveGroup(def: Definition, key: string, direction: -1 | 1): Definition {
  const steps = stepsOf(def);
  const at = steps.findIndex(s => s.groups.some(g => g.key === key));
  const target = at + direction;
  if (at < 0 || target < 0 || target >= steps.length) return def;
  const orderOf = new Map<string, number>();
  steps.forEach((s, i) => s.groups.forEach(g => orderOf.set(g.key, i + 1)));
  orderOf.set(key, target + 1);
  return {...def, groups: def.groups.map(g => ({...g, order: orderOf.get(g.key) ?? g.order}))};
}

/** The group runs together with the one before it: it takes the same step number. */
export function joinPreviousStep(def: Definition, key: string): Definition {
  const steps = stepsOf(def);
  const at = steps.findIndex(s => s.groups.some(g => g.key === key));
  if (at < 1) return def;
  const order = steps[at - 1].order;
  return {...def, groups: def.groups.map(g => (g.key === key ? {...g, order} : g))};
}

/** The group leaves the step it shares and becomes its own step right after it. */
export function splitFromStep(def: Definition, key: string): Definition {
  const g = def.groups.find(x => x.key === key);
  if (!g) return def;
  return normalizeOrders({
    ...def,
    groups: def.groups.map(x => (x.key === key ? {...x, order: g.order + 1} : x.order > g.order ? {...x, order: x.order + 1} : x)),
  });
}

/** Renumbers group orders to 1, 2, 3... keeping the steps (same number stays together). */
export function normalizeOrders(def: Definition): Definition {
  const steps = stepsOf(def);
  const orderOf = new Map<string, number>();
  steps.forEach((s, i) => s.groups.forEach(g => orderOf.set(g.key, i + 1)));
  return {...def, groups: def.groups.map(g => ({...g, order: orderOf.get(g.key) ?? g.order}))};
}
