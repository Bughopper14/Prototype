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
    let next: Definition = {...def, groups: def.groups.filter(g => g.key !== key), approvals: def.approvals.filter(a => !(a.scope === 'GROUP' && a.groupKey === key))};
    for (const s of def.stages.filter(x => x.groupKey === key)) next = removePart(next, 'stage', s.key);
    return next;
  }
  return {
    ...def,
    stages: def.stages.filter(s => s.key !== key),
    fields: def.fields.filter(f => f.stageKey !== key),
    documents: def.documents.filter(d => d.stageKey !== key),
    approvals: def.approvals.filter(a => a.stageKey !== key),
  };
}

/**
 * Order of groups (and of the stages inside a group). Items are in running order; each position says whether it runs AFTER the one before
 * it or TOGETHER with it (the same `order` number). The numbers are never typed: they are made from the positions.
 *   - moving an item swaps it with its neighbour (and does nothing when both are in the same step, they are at the same time anyway),
 *   - "together with the previous" / "after the previous" changes only that position.
 */
type Ordered = {key: string; order: number; name: string};

function sequence<T extends Ordered>(items: T[]) {
  const sorted = [...items].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return {sorted, together: sorted.map((x, i) => i > 0 && x.order === sorted[i - 1].order)};
}

/** The order numbers (1, 2, 3...) for items in this sequence: a position that is "together" takes the number of the one before it. */
function numbered<T extends Ordered>(sorted: T[], together: boolean[]) {
  const out = new Map<string, number>();
  let n = 0;
  sorted.forEach((x, i) => {
    if (i === 0 || !together[i]) n += 1;
    out.set(x.key, n);
  });
  return out;
}

const withOrders = <T extends Ordered>(list: T[], orders: Map<string, number>) => list.map(x => (orders.has(x.key) ? {...x, order: orders.get(x.key)!} : x));

const stagesOfGroupOf = (def: Definition, key: string) => {
  const groupKey = def.stages.find(s => s.key === key)?.groupKey;
  return def.stages.filter(s => s.groupKey === groupKey);
};

/**
 * Where an item goes: together with the step another item is in, as its own new step before/after the step another item is in, or as the
 * first / last step. The step numbers are made from the positions, so nothing is typed.
 */
export type Placement = {with: string} | {before: string} | {after: string} | {first: true} | {last: true};

function place<T extends Ordered>(items: T[], key: string, to: Placement): Map<string, number> | null {
  const {sorted} = sequence(items);
  const steps: string[][] = [];
  let lastOrder: number | null = null;
  for (const x of sorted) {
    if (x.key === key) continue;
    if (x.order === lastOrder) steps[steps.length - 1].push(x.key);
    else {
      steps.push([x.key]);
      lastOrder = x.order;
    }
  }
  const at = (anchor: string) => steps.findIndex(st => st.includes(anchor));
  if ('with' in to) {
    const i = at(to.with);
    if (i < 0) return null;
    steps[i].push(key);
  } else if ('before' in to) {
    const i = at(to.before);
    if (i < 0) return null;
    steps.splice(i, 0, [key]);
  } else if ('after' in to) {
    const i = at(to.after);
    if (i < 0) return null;
    steps.splice(i + 1, 0, [key]);
  } else if ('first' in to) steps.unshift([key]);
  else steps.push([key]);
  const out = new Map<string, number>();
  steps.forEach((st, i) => st.forEach(k => out.set(k, i + 1)));
  const now = numbered(sorted, sequence(items).together);
  return [...out].every(([k, v]) => now.get(k) === v) ? null : out;
}

export function placeGroup(def: Definition, key: string, to: Placement): Definition {
  const orders = place(def.groups, key, to);
  return orders ? {...def, groups: withOrders(def.groups, orders)} : def;
}

export function placeStage(def: Definition, key: string, to: Placement): Definition {
  const orders = place(stagesOfGroupOf(def, key), key, to);
  return orders ? {...def, stages: withOrders(def.stages, orders)} : def;
}

/** The moves this item can make (the ones that would change nothing are left out), for a "Move" menu. */
export function placementOptions<T extends Ordered>(items: T[], key: string): {label: string; to: Placement; group: 'together' | 'alone'}[] {
  const {sorted} = sequence(items);
  const steps: T[][] = [];
  for (const x of sorted) {
    const last = steps[steps.length - 1];
    if (last && last[0].order === x.order) last.push(x);
    else steps.push([x]);
  }
  const names = (st: T[]) => st.filter(x => x.key !== key).map(x => x.name).join(' + ');
  const out: {label: string; to: Placement; group: 'together' | 'alone'}[] = [];
  steps.forEach((st, i) => {
    const others = st.filter(x => x.key !== key);
    if (!others.length || st.some(x => x.key === key)) return;
    out.push({label: `${names(st)} (step ${i + 1})`, to: {with: others[0].key}, group: 'together'});
  });
  steps.forEach((st, i) => {
    const others = st.filter(x => x.key !== key);
    if (!others.length) return;
    if (i === 0) out.push({label: 'Before everything, as the first step', to: {first: true}, group: 'alone'});
    out.push({label: `After step ${i + 1} (${names(st)})`, to: {after: others[0].key}, group: 'alone'});
  });
  return out.filter(o => place(items, key, o.to) !== null);
}
