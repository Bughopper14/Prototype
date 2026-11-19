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

/** Does this item run together with the one before it? (The first item never does.) */
export function runsTogether<T extends Ordered>(items: T[], key: string): boolean {
  const {sorted, together} = sequence(items);
  const i = sorted.findIndex(x => x.key === key);
  return i > 0 && together[i];
}

/** Can the item swap with its neighbour on that side? Not when there is none, or when both run at the same time. */
export function canMove<T extends Ordered>(items: T[], key: string, direction: -1 | 1): boolean {
  const {sorted, together} = sequence(items);
  const i = sorted.findIndex(x => x.key === key);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= sorted.length) return false;
  return !(direction === 1 ? together[j] : together[i]);
}

function moved<T extends Ordered>(items: T[], key: string, direction: -1 | 1): Map<string, number> | null {
  if (!canMove(items, key, direction)) return null;
  const {sorted, together} = sequence(items);
  const i = sorted.findIndex(x => x.key === key);
  const j = i + direction;
  [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
  return numbered(sorted, together);
}

function setTogether<T extends Ordered>(items: T[], key: string, value: boolean): Map<string, number> | null {
  const {sorted, together} = sequence(items);
  const i = sorted.findIndex(x => x.key === key);
  if (i < 1 || together[i] === value) return null;
  together[i] = value;
  return numbered(sorted, together);
}

/** A group swaps places with the previous / next group. */
export function moveGroup(def: Definition, key: string, direction: -1 | 1): Definition {
  const orders = moved(def.groups, key, direction);
  return orders ? {...def, groups: withOrders(def.groups, orders)} : def;
}

/** The group runs together with the group before it (true) or after it (false). */
export function setGroupTogether(def: Definition, key: string, together: boolean): Definition {
  const orders = setTogether(def.groups, key, together);
  return orders ? {...def, groups: withOrders(def.groups, orders)} : def;
}

const stagesOfGroupOf = (def: Definition, key: string) => {
  const groupKey = def.stages.find(s => s.key === key)?.groupKey;
  return def.stages.filter(s => s.groupKey === groupKey);
};

/** A stage swaps places with the previous / next stage of its group. */
export function moveStage(def: Definition, key: string, direction: -1 | 1): Definition {
  const orders = moved(stagesOfGroupOf(def, key), key, direction);
  return orders ? {...def, stages: withOrders(def.stages, orders)} : def;
}

/** The stage runs together with the stage before it in its group (true) or after it (false). */
export function setStageTogether(def: Definition, key: string, together: boolean): Definition {
  const orders = setTogether(stagesOfGroupOf(def, key), key, together);
  return orders ? {...def, stages: withOrders(def.stages, orders)} : def;
}

/** Renumbers group orders to 1, 2, 3... keeping the steps (same number stays together). */
export function normalizeOrders(def: Definition): Definition {
  const steps = stepsOf(def);
  const orderOf = new Map<string, number>();
  steps.forEach((s, i) => s.groups.forEach(g => orderOf.set(g.key, i + 1)));
  return {...def, groups: def.groups.map(g => ({...g, order: orderOf.get(g.key) ?? g.order}))};
}
