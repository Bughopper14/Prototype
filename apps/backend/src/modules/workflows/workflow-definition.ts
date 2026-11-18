import {z} from 'zod';

/**
 * The definition of one workflow as Workflow setup edits it: groups (the order the stages run in), the stages inside
 * them, and per stage the required fields and documents. Items refer to each other by `key`; the database `code` of a group
 * or stage is built by the backend (name trimmed and upper-case) when the item is new, and kept when the item already has one.
 * Saving replaces the whole definition of a workflow that is a draft and has no application.
 *
 * Order: groups run in ascending `order`; groups with the same `order` run in parallel. Stages work the same way inside
 * their group. There are no "levels".
 *
 * A workflow has no statuses or actions. Its approval layer is a list of approval steps: each step approves a group, a stage or one
 * document of a stage, runs in order (steps with the same order run in parallel) and is guarded by ONE existing authority (chosen from
 * User Management). Anyone holding that authority can approve or reject.
 */

import {toCode} from '../../core/domain/code';
export {toCode};

const key = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid key');
const name = (max: number) => z.string().trim().min(1).max(max);
const order = z.number().int().min(1).max(1000);

export const definitionSchema = z.object({
  groups: z.array(
    z.object({
      key,
      code: z.string().trim().max(50).nullish(),
      name: name(100),
      order,
    }),
  ),
  stages: z.array(
    z.object({
      key,
      code: z.string().trim().max(50).nullish(),
      groupKey: key,
      name: name(100),
      departmentCode: z.string().trim().max(50).nullish(),
      order: order.default(1),
      formCode: z.string().trim().max(60).nullish(),
    }),
  ),
  fields: z.array(
    z.object({stageKey: key, formCode: z.string().max(60), section: z.string().max(100), code: z.string().max(100), mandatory: z.boolean()}),
  ),
  documents: z.array(z.object({stageKey: key, documentCode: z.string().max(60), isDefault: z.boolean(), isMandatory: z.boolean()})),
  /** The approval steps. GROUP needs groupKey, STAGE needs stageKey, DOCUMENT needs stageKey and documentCode (a document listed in that stage). */
  approvalSteps: z
    .array(
      z.object({
        key,
        code: z.string().trim().max(50).nullish(),
        name: name(100),
        scope: z.enum(['GROUP', 'STAGE', 'DOCUMENT']),
        groupKey: key.nullish(),
        stageKey: key.nullish(),
        documentCode: z.string().trim().max(60).nullish(),
        order,
        /** The authority that guards the step: the name of an existing users_authorities row. Several steps may use the same one. */
        authorityName: z.string().trim().min(1, 'Choose who can approve').max(100),
      }),
    )
    .default([]),
});

export type WorkflowDefinition = z.infer<typeof definitionSchema>;

export const emptyDefinition = (): WorkflowDefinition => ({groups: [], stages: [], fields: [], documents: [], approvalSteps: []});

export type Issue = {level: 'error' | 'warning'; message: string};

const dupes = (values: string[]) => values.filter((v, i) => values.indexOf(v) !== i);

/** What must hold before a draft can be saved: references and uniqueness. `knownDocuments` are the Master Data document codes. */
export function referenceIssues(def: WorkflowDefinition, knownDocuments: Set<string>): Issue[] {
  const issues: Issue[] = [];
  const err = (message: string) => issues.push({level: 'error', message});
  for (const c of new Set(dupes(def.groups.map(g => g.key)))) err(`A group is listed twice (${c}).`);
  for (const c of new Set(dupes(def.stages.map(s => s.key)))) err(`A stage is listed twice (${c}).`);
  for (const c of new Set(dupes(def.groups.map(g => toCode(g.name))))) err(`Two groups have the same name (${c}).`);
  for (const c of new Set(dupes(def.stages.map(s => toCode(s.name))))) err(`Two stages have the same name (${c}).`);
  const groups = new Set(def.groups.map(g => g.key));
  const stages = new Set(def.stages.map(s => s.key));
  for (const s of def.stages) if (!groups.has(s.groupKey)) err(`Stage "${s.name}" is in a group that does not exist.`);
  for (const f of def.fields) if (!stages.has(f.stageKey)) err('A required field refers to a stage that does not exist.');
  for (const d of def.documents) {
    if (!stages.has(d.stageKey)) err('A document refers to a stage that does not exist.');
    if (!knownDocuments.has(d.documentCode)) err(`Document "${d.documentCode}" does not exist in Master Data.`);
  }
  for (const c of new Set(dupes(def.documents.map(d => `${d.stageKey}|${d.documentCode}`)))) err(`A document is listed twice in the same stage (${c.split('|')[1]}).`);
  for (const c of new Set(dupes(def.fields.map(f => `${f.stageKey}|${f.formCode}|${f.section}|${f.code}`)))) err(`A field is listed twice in the same stage (${c.split('|')[3]}).`);
  for (const c of new Set(dupes(def.approvalSteps.map(a => a.key)))) err(`An approval step is listed twice (${c}).`);
  for (const c of new Set(dupes(def.approvalSteps.map(a => toCode(a.name))))) err(`Two approval steps have the same name (${c}).`);
  for (const a of def.approvalSteps) {
    const label = `Approval step "${a.name}"`;
    if (a.scope === 'GROUP' && (!a.groupKey || !groups.has(a.groupKey))) err(`${label} must approve a group that exists.`);
    if (a.scope === 'STAGE' && (!a.stageKey || !stages.has(a.stageKey))) err(`${label} must approve a stage that exists.`);
    if (a.scope === 'DOCUMENT') {
      if (!a.stageKey || !stages.has(a.stageKey)) err(`${label} must approve a document of a stage that exists.`);
      else if (!a.documentCode || !def.documents.some(d => d.stageKey === a.stageKey && d.documentCode === a.documentCode)) err(`${label} must approve a document listed in its stage.`);
    }
  }
  return issues;
}

/** What must hold before a workflow is activated. */
export function activationIssues(def: WorkflowDefinition): Issue[] {
  const issues: Issue[] = [];
  const err = (message: string) => issues.push({level: 'error', message});
  const warn = (message: string) => issues.push({level: 'warning', message});
  if (!def.groups.length) err('Add at least one group.');
  if (!def.stages.length) err('Add at least one stage.');
  for (const g of def.groups) if (!def.stages.some(s => s.groupKey === g.key)) err(`Group "${g.name}" has no stage.`);
  // the documents of a stage are the responsibility of its department, so a stage always has one
  for (const s of def.stages) if (!s.departmentCode) err(`Stage "${s.name}" needs a department.`);
  if (def.stages.length && !def.stages.some(s => s.formCode)) warn('No stage shows a form, so there is nothing to require there.');
  return issues;
}
