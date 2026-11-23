import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {Problem, ensure} from '../../core/domain';
import {WorkflowFreezeRepository} from './workflow-freeze.repository';
import {diffVersions, summarize, type VersionContent} from './workflow-diff';
import {DocumentsRepository} from '../documents/documents.repository';
import {UsersApproversLookup} from './users-approvers.lookup';
import {
  activationIssues,
  definitionSchema,
  emptyDefinition,
  referenceIssues,
  toCode,
  type Issue,
  type WorkflowDefinition,
} from './workflow-definition';

type Conn = Pick<PoolConnection, 'query' | 'execute'>;
const uuid = () => crypto.randomUUID();


/**
 * Workflow setup: create, edit, set active and delete workflows. A workflow defines the stages of an application and what each stage
 * requires (fields, documents, approvals).
 *
 * A workflow can be edited at any time. Every create or save makes a new freeze (see WorkflowFreezeRepository): an application connects to
 * the freeze that was newest when it started and keeps it. One workflow is "active": new applications start in its newest freeze.
 * Deleting a workflow does not touch its freezes.
 */
@Injectable()
export class WorkflowsService {
  constructor(
    private readonly db: CrmDatabase,
    private readonly freezes: WorkflowFreezeRepository,
    private readonly documents: DocumentsRepository,
    private readonly approvers: UsersApproversLookup,
  ) {}

  /* ---------- reads ---------- */

  async list() {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT w.*,${this.freezeColumns},${this.applicationsColumn}
       FROM ${CRM.workflows} w
       ORDER BY w.is_active DESC,w.name`,
    );
    // The groups of every workflow in running order, with their stages, for the flow shown on each card.
    const [stageRows] = await this.db.pool.query<any[]>(
      `SELECT g.workflow_code,g.code AS group_code,g.name AS group_name,g.sort_order AS group_order,s.name AS stage_name,s.sort_order AS stage_order
       FROM ${CRM.workflowStageGroups} g LEFT JOIN ${CRM.workflowStages} s ON s.workflow_code=g.workflow_code AND s.group_code=g.code
       ORDER BY g.sort_order,g.name,s.sort_order,s.name`,
    );
    const flow = new Map<string, {code: string; name: string; order: number; stages: {name: string; order: number}[]}[]>();
    for (const r of stageRows) {
      const groups = flow.get(r.workflow_code) || [];
      let g = groups.find(x => x.code === r.group_code);
      if (!g) groups.push((g = {code: r.group_code, name: r.group_name, order: Number(r.group_order), stages: []}));
      if (r.stage_name) g.stages.push({name: r.stage_name, order: Number(r.stage_order)});
      flow.set(r.workflow_code, groups);
    }
    return rows.map(r => ({...this.header(r), flow: (flow.get(r.code) || []).map(({name, order, stages}) => ({name, order, stages}))}));
  }

  /** The newest freeze of a workflow (its number and time) and the applications that run on any freeze of it. */
  private readonly freezeColumns = `(SELECT f.freeze_version FROM ${CRM.frozenWorkflows} f WHERE f.source_workflow_code=w.code AND f.is_latest_freeze=1) AS freeze_version,
       (SELECT f.frozen_at FROM ${CRM.frozenWorkflows} f WHERE f.source_workflow_code=w.code AND f.is_latest_freeze=1) AS frozen_at`;
  private readonly applicationsColumn = `(SELECT COUNT(*) FROM ${CRM.applications} a JOIN ${CRM.frozenWorkflows} f ON f.id=a.workflow_freeze_id WHERE f.source_workflow_code=w.code AND a.deleted_at IS NULL) AS applications`;

  private header(r: any) {
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      isActive: !!r.is_active,
      freezeVersion: r.freeze_version === null || r.freeze_version === undefined ? null : Number(r.freeze_version),
      frozenAt: r.frozen_at ?? null,
      applications: r.applications === undefined ? undefined : Number(r.applications),
      updatedAt: r.updated_at ?? r.created_at,
    };
  }

  async get(id: string) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT w.*,${this.freezeColumns},${this.applicationsColumn}
       FROM ${CRM.workflows} w WHERE w.id=?`,
      [id],
    );
    ensure(rows[0], 'Workflow not found', 404);
    return {workflow: this.header(rows[0]), definition: await this.definition(rows[0].code)};
  }

  /**
   * Everything Workflow setup can choose from. A form, section or document can carry an approval only when it is flagged is_approval in
   * the masters (that flag is the registry); `approvals` are the master approvals a place can point at.
   */
  async catalog() {
    const [docs] = await this.db.pool.query<any[]>(
      `SELECT code,name,is_approval FROM ${CRM.masterDocumentTypes} ORDER BY sort_order`,
    );
    // the fields of every form come from the master (crm_master_form_fields); enforceable = the system can check it
    const [fields] = await this.db.pool.query<any[]>(
      `SELECT f.form_code,s.name AS section_name,f.section_code,f.code,f.label,f.is_enforceable FROM ${CRM.masterFormFields} f JOIN ${CRM.masterFormSections} s ON s.code=f.section_code ORDER BY f.form_code,s.sort_order,s.name,f.sort_order`,
    );
    const [sections] = await this.db.pool.query<any[]>(
      `SELECT form_code,code,name,is_approval,is_repeating FROM ${CRM.masterFormSections} ORDER BY form_code,sort_order,name`,
    );
    return {
      formFields: fields.map(f => ({formCode: f.form_code, section: f.section_name, sectionCode: f.section_code, code: f.code, label: f.label, enforceable: !!f.is_enforceable})),
      forms: await this.forms(),
      sections: sections.map(x => ({formCode: x.form_code, code: x.code, name: x.name, isApproval: !!x.is_approval, isRepeating: !!x.is_repeating})),
      documents: docs.map(d => ({code: d.code, name: d.name, isApproval: !!d.is_approval})),
      departments: await this.departments(),
      approvals: await this.masterApprovals(),
    };
  }

  /** The forms a stage can show: the master form list (crm_master_forms). */
  async forms(): Promise<{code: string; name: string; isApproval: boolean}[]> {
    const [rows] = await this.db.pool.query<any[]>(`SELECT code,name,is_approval FROM ${CRM.masterForms} ORDER BY sort_order,code`);
    return rows.map(r => ({code: r.code, name: r.name, isApproval: !!r.is_approval}));
  }

  /** The master approvals with their levels (read-only here; they are made in Master approval). */
  async masterApprovals() {
    const [approvals] = await this.db.pool.query<any[]>(`SELECT code,name FROM ${CRM.masterApprovals} ORDER BY name,code`);
    const [levels] = await this.db.pool.query<any[]>(`SELECT approval_code,level_no,authority_name,is_pic_marketing FROM ${CRM.masterApprovalLevels} ORDER BY approval_code,level_no,is_pic_marketing,authority_name`);
    return approvals.map(a => ({
      code: a.code,
      name: a.name,
      levels: levels.filter(l => l.approval_code === a.code).map(l => ({levelNo: Number(l.level_no), authorityName: l.authority_name ?? '', isPicMarketing: !!l.is_pic_marketing})),
    }));
  }

  /**
   * The departments a stage can be given to: the departments of User Management (code and name), plus any code the CRM already uses on a
   * stage or a document override, so nothing a workflow already has disappears from the list.
   */
  async departments(): Promise<{code: string; name: string}[]> {
    const out = new Map<string, string>();
    try {
      for (const d of (await this.approvers.list()).departments) out.set(toCode(d.department_code), String(d.department_name || d.department_code));
    } catch {
      // the list still works without User Management
    }
    for (const d of await this.documents.departments()) if (!out.has(d.code)) out.set(d.code, d.name);
    return [...out].map(([code, name]) => ({code, name})).sort((a, b) => a.code.localeCompare(b.code));
  }

  /** The definition of a workflow in the shape the editor works with (an item's key is its code). */
  async definition(workflowCode: string, conn: Conn = this.db.pool): Promise<WorkflowDefinition & {groups: any[]; stages: any[]}> {
    const q = async (sql: string) => (await conn.query<any[]>(sql, [workflowCode]))[0];
    const groups = await q(`SELECT * FROM ${CRM.workflowStageGroups} WHERE workflow_code=? ORDER BY sort_order,name`);
    const stages = await q(
      `SELECT s.*,g.code AS group_code FROM ${CRM.workflowStages} s JOIN ${CRM.workflowStageGroups} g ON g.workflow_code=s.workflow_code AND g.code=s.group_code
       WHERE s.workflow_code=? ORDER BY g.sort_order,g.name,s.sort_order,s.name`,
    );
    const fields = await q(
      `SELECT s.code AS stage_code,ff.form_code,fs.name AS section_name,ff.code,sf.is_mandatory FROM ${CRM.workflowStageFields} sf
       JOIN ${CRM.workflowStages} s ON s.workflow_code=sf.workflow_code AND s.code=sf.stage_code JOIN ${CRM.masterFormFields} ff ON ff.code=sf.form_field_code
       JOIN ${CRM.masterFormSections} fs ON fs.code=ff.section_code
       WHERE sf.workflow_code=?`,
    );
    const documents = await q(
      `SELECT s.code AS stage_code,t.code AS document_code,sd.is_default,sd.is_mandatory FROM ${CRM.workflowStageDocuments} sd
       JOIN ${CRM.workflowStages} s ON s.workflow_code=sd.workflow_code AND s.code=sd.stage_code JOIN ${CRM.masterDocumentTypes} t ON t.id=sd.document_type_id
       WHERE sd.workflow_code=? ORDER BY sd.sort_order`,
    );
    const approvals = await q(`SELECT * FROM ${CRM.workflowApprovalAssignments} WHERE workflow_code=? ORDER BY scope_type,code`);
    return {
      approvals: approvals.map(a => ({
        scope: a.scope_type,
        groupKey: a.group_code ?? null,
        stageKey: a.stage_code ?? null,
        sectionCode: a.section_code ?? null,
        documentCode: a.document_code ?? null,
        approvalCode: a.approval_code,
      })),
      groups: groups.map(g => ({key: g.code, code: g.code, name: g.name, order: Number(g.sort_order)})),
      stages: stages.map(s => ({key: s.code, code: s.code, groupKey: s.group_code, name: s.name, departmentCode: s.department_code, order: Number(s.sort_order), formCode: s.form_code})),
      fields: fields.map(f => ({stageKey: f.stage_code, formCode: f.form_code, section: f.section_name, code: f.code, mandatory: !!f.is_mandatory})),
      documents: documents.map(d => ({stageKey: d.stage_code, documentCode: d.document_code, isDefault: !!d.is_default, isMandatory: !!d.is_mandatory})),
    };
  }

  /* ---------- edit ---------- */

  private async lockWorkflow(conn: Conn, id: string) {
    const [rows] = await conn.query<any[]>(`SELECT * FROM ${CRM.workflows} WHERE id=? FOR UPDATE`, [id]);
    ensure(rows[0], 'Workflow not found', 404);
    return rows[0];
  }

  /** A code that no workflow uses yet: the name as a code, with -2, -3... when it is taken. */
  private async freshWorkflowCode(conn: Conn, name: string) {
    const base = toCode(name) || 'WORKFLOW';
    for (let n = 1; n < 1000; n++) {
      // the suffix is part of the 50 characters: cutting after adding it would give the same code again and again for a long name
      const suffix = n === 1 ? '' : `-${n}`;
      const candidate = base.slice(0, 50 - suffix.length).replace(/-+$/, '') + suffix;
      // A code is taken for good: a deleted workflow leaves its versions and log behind, and a new one must not inherit them.
      const [rows] = await conn.query<any[]>(
        `SELECT 1 FROM ${CRM.workflows} WHERE code=? UNION ALL SELECT 1 FROM ${CRM.frozenWorkflows} WHERE source_workflow_code=? UNION ALL SELECT 1 FROM ${CRM.workflowLogs} WHERE workflow_code=?`,
        [candidate, candidate, candidate],
      );
      if (!rows.length) return candidate;
    }
    throw new Problem(409, 'There is no free code left for this workflow name; choose another name');
  }

  /** A new empty workflow (frozen right away). */
  async create(input: {name: string; description?: string | null}, by: string | null) {
    ensure(String(input.name || '').trim(), 'Give the workflow a name', 422);
    const id = uuid();
    await this.db.transaction(async conn => {
      const code = await this.freshWorkflowCode(conn, input.name);
      await conn.execute(`INSERT INTO ${CRM.workflows} (id,code,name,description,is_active,created_by) VALUES (?,?,?,?,0,?)`, [id, code, String(input.name).trim(), input.description || null, by]);
      await this.write(conn, code, emptyDefinition(), by);
      await this.freezes.freezeWorkflow(conn, code, by);
      await this.freezes.logWorkflow(conn, code, String(input.name).trim(), 'CREATE', `Created the workflow ${String(input.name).trim()}`, by);
    });
    return this.get(id);
  }

  async rename(id: string, input: {name?: string; description?: string | null}, by: string | null) {
    await this.db.transaction(async conn => {
      const row = await this.lockWorkflow(conn, id);
      if (input.name !== undefined) ensure(String(input.name).trim(), 'Give the workflow a name', 422);
      await conn.execute(`UPDATE ${CRM.workflows} SET name=COALESCE(?,name),description=?,updated_by=? WHERE id=?`, [
        input.name === undefined ? null : String(input.name).trim(),
        input.description ?? null,
        by,
        id,
      ]);
      await this.freezes.freezeWorkflow(conn, row.code, by);
      const nameNow = input.name === undefined ? row.name : String(input.name).trim();
      await this.freezes.logWorkflow(conn, row.code, nameNow, 'RENAME', input.name !== undefined && nameNow !== row.name ? `Renamed ${row.name} to ${nameNow}` : `Changed the description of ${nameNow}`, by);
    });
    return this.get(id);
  }

  /** Replaces the whole definition of a workflow, then freezes it. */
  async saveDefinition(id: string, raw: unknown, by: string | null) {
    const parsed = definitionSchema.safeParse(raw);
    if (!parsed.success) throw new Problem(422, parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
    const def = parsed.data;
    const issues = referenceIssues(def, await this.documentCodes()).filter(i => i.level === 'error');
    for (const s of def.stages)
      if (s.departmentCode && !(await this.departments()).some(d => d.code === s.departmentCode))
        issues.push({level: 'error', message: `Stage "${s.name}" has a department that does not exist (${s.departmentCode}).`});
    // a stage may only show a form of the master form list
    const formCodes = new Set((await this.forms()).map(f => f.code));
    for (const st of def.stages) if (st.formCode && !formCodes.has(st.formCode)) issues.push({level: 'error', message: `Stage "${st.name}" shows a form that does not exist (${st.formCode}).`});
    // an approval points at an existing master approval, on a place that is flagged is_approval in the masters (the registry)
    const registry = await this.registry();
    for (const a of def.approvals) {
      if (!registry.approvals.has(a.approvalCode)) issues.push({level: 'error', message: `The approval ${a.approvalCode} does not exist in Master approval.`});
      const stage = def.stages.find(x => x.key === a.stageKey);
      if (a.scope === 'STAGE' && stage?.formCode && !registry.forms.get(stage.formCode))
        issues.push({level: 'error', message: `Stage "${stage.name}" shows a form that cannot have an approval (${stage.formCode}).`});
      if (a.scope === 'SECTION') {
        const section = registry.sections.get(a.sectionCode || '');
        if (!section) issues.push({level: 'error', message: `The section ${a.sectionCode} does not exist.`});
        else if (!section.isApproval) issues.push({level: 'error', message: `The section "${section.name}" cannot have an approval (it is not flagged is_approval).`});
        else if (stage && section.formCode !== stage.formCode) issues.push({level: 'error', message: `The section "${section.name}" is not in the form of stage "${stage.name}".`});
      }
      if (a.scope === 'DOCUMENT' && !registry.documents.get(a.documentCode || ''))
        issues.push({level: 'error', message: `The document ${a.documentCode} cannot have an approval (it is not flagged is_approval).`});
    }
    if (issues.length) throw new Problem(422, issues.map(i => i.message).join(' '), issues.map(i => ({field: 'workflow', detail: i.message})));
    let code = '';
    await this.db.transaction(async conn => {
      const row = await this.lockWorkflow(conn, id);
      code = row.code;
      await this.write(conn, code, def, by);
      await conn.execute(`UPDATE ${CRM.workflows} SET updated_by=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`, [by, id]);
      await this.freezes.freezeWorkflow(conn, code, by);
      await this.freezes.logWorkflow(conn, code, row.name, 'EDIT', `Saved the workflow: ${def.groups.length} group${def.groups.length === 1 ? '' : 's'}, ${def.stages.length} stage${def.stages.length === 1 ? '' : 's'}, ${def.approvals.length} approval${def.approvals.length === 1 ? '' : 's'}`, by);
    });
    return this.get(id);
  }

  private async documentCodes(): Promise<Set<string>> {
    const [docs] = await this.db.pool.query<any[]>(`SELECT code FROM ${CRM.masterDocumentTypes}`);
    return new Set(docs.map(d => d.code));
  }

  /** The registry: which forms, sections and documents may have an approval (the is_approval flag of the masters). */
  private async registry() {
    const [forms] = await this.db.pool.query<any[]>(`SELECT code,is_approval FROM ${CRM.masterForms}`);
    const [sections] = await this.db.pool.query<any[]>(`SELECT code,name,form_code,is_approval FROM ${CRM.masterFormSections}`);
    const [docs] = await this.db.pool.query<any[]>(`SELECT code,is_approval FROM ${CRM.masterDocumentTypes}`);
    const [approvals] = await this.db.pool.query<any[]>(`SELECT code FROM ${CRM.masterApprovals}`);
    return {
      forms: new Map<string, boolean>(forms.map(f => [f.code, !!f.is_approval])),
      sections: new Map(sections.map(x => [x.code as string, {name: x.name as string, formCode: x.form_code as string, isApproval: !!x.is_approval}])),
      documents: new Map<string, boolean>(docs.map(d => [d.code, !!d.is_approval])),
      approvals: new Set<string>(approvals.map(a => a.code as string)),
    };
  }

  private async clear(conn: Conn, workflowCode: string) {
    // stage fields first: they point at the field catalog rows that go with the stages
    for (const table of [CRM.workflowApprovalAssignments, CRM.workflowStageDocuments, CRM.workflowStageFields, CRM.workflowStages, CRM.workflowStageGroups])
      await conn.query(`DELETE FROM ${table} WHERE workflow_code=?`, [workflowCode]);
  }

  /** `code` when the item already has one (it is kept), else the name as a code; made unique with _2, _3... */
  private uniqueCode(taken: Set<string>, existing: string | null | undefined, name: string, max: number, fallback: string) {
    // A code that is already stored is kept as it is (stage codes follow the approval master, e.g. FAP_STAGE); only new codes are made from the name.
    const base = (String(existing || '').trim().toUpperCase() || toCode(name) || fallback).slice(0, max);
    let code = base;
    for (let n = 2; taken.has(code); n++) code = `${base.slice(0, max - String(n).length - 1)}-${n}`;
    taken.add(code);
    return code;
  }

  /** Writes a definition for a draft (deleting what was there). */
  private async write(conn: Conn, workflowCode: string, def: WorkflowDefinition, by: string | null) {
    await this.clear(conn, workflowCode);
    const groupCodes = new Map<string, string>();
    const groupTaken = new Set<string>();
    for (const g of def.groups) {
      const gcode = this.uniqueCode(groupTaken, g.code, g.name, 50, 'GROUP');
      groupCodes.set(g.key, gcode);
      await conn.execute(
        `INSERT INTO ${CRM.workflowStageGroups} (id,workflow_code,code,name,sort_order,created_by)
         VALUES (?,?,?,?,?,?)`,
        [uuid(), workflowCode, gcode, g.name, g.order, by],
      );
    }
    const stageCodes = new Map<string, string>();
    const stageTaken = new Set<string>();
    for (const s of def.stages) {
      const scode = this.uniqueCode(stageTaken, s.code, s.name, 50, 'STAGE');
      stageCodes.set(s.key, scode);
      await conn.execute(
        `INSERT INTO ${CRM.workflowStages} (id,workflow_code,group_code,code,name,department_code,sort_order,form_code,created_by)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [uuid(), workflowCode, groupCodes.get(s.groupKey)!, scode, s.name, s.departmentCode || null, s.order, s.formCode || null, by],
      );
    }
    // a required field is a row that points at the master field (the master is the only list of fields)
    const [masterFields] = await conn.query<any[]>(`SELECT f.form_code,s.name AS section_name,f.code FROM ${CRM.masterFormFields} f JOIN ${CRM.masterFormSections} s ON s.code=f.section_code`);
    const master = new Map(masterFields.map(m => [m.code as string, m]));
    for (const f of def.fields) {
      // the code of a field is unique (section + field); the form and section sent with it have to be the ones of that field
      const known = master.get(f.code);
      ensure(known && known.form_code === f.formCode && known.section_name === f.section, `Field ${f.section} / ${f.code} does not exist in the ${f.formCode} form`, 422);
      await conn.execute(
        `INSERT INTO ${CRM.workflowStageFields} (id,workflow_code,stage_code,form_field_code,is_mandatory,created_by) VALUES (?,?,?,?,?,?)`,
        [uuid(), workflowCode, stageCodes.get(f.stageKey)!, f.code, +f.mandatory, by],
      );
    }
    const stageGroup = new Map(def.stages.map(s => [s.key, s.groupKey]));
    for (const [i, d] of def.documents.entries()) {
      const [rows] = await conn.query<any[]>(`SELECT id FROM ${CRM.masterDocumentTypes} WHERE code=?`, [d.documentCode]);
      await conn.execute(
        `INSERT INTO ${CRM.workflowStageDocuments} (id,workflow_code,group_code,stage_code,document_type_id,document_code,is_default,is_mandatory,sort_order,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [uuid(), workflowCode, groupCodes.get(stageGroup.get(d.stageKey)!)!, stageCodes.get(d.stageKey)!, rows[0].id, d.documentCode, +d.isDefault, +d.isMandatory, i, by],
      );
    }
    // The approvals: one row per place, pointing at a master approval. The code names the place (group, stage, section or document).
    for (const a of def.approvals) {
      const gcode = a.scope === 'GROUP' ? groupCodes.get(a.groupKey!)! : null;
      const scode = a.scope === 'GROUP' ? null : stageCodes.get(a.stageKey!)!;
      const place = a.scope === 'GROUP' ? gcode : a.scope === 'STAGE' ? scode : a.scope === 'SECTION' ? `${scode}-${a.sectionCode}` : `${scode}-${a.documentCode}`;
      await conn.execute(
        `INSERT INTO ${CRM.workflowApprovalAssignments}
           (id,workflow_code,code,scope_type,section_code,group_code,stage_code,document_code,approval_code,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          uuid(),
          workflowCode,
          `${a.scope}-${place}`.slice(0, 110),
          a.scope,
          a.scope === 'SECTION' ? a.sectionCode! : null,
          gcode,
          scode,
          a.scope === 'DOCUMENT' ? a.documentCode! : null,
          a.approvalCode,
          by,
        ],
      );
    }
  }

  /* ---------- active / delete ---------- */

  /** Problems that stop setting a workflow active (errors) and things worth a look (warnings). */
  async validate(id: string): Promise<{ok: boolean; issues: Issue[]}> {
    const {definition} = await this.get(id);
    const issues = [...referenceIssues(definition, await this.documentCodes()), ...activationIssues(definition)];
    return {ok: !issues.some(i => i.level === 'error'), issues};
  }

  /** The workflow becomes the one new applications start in (the newest freeze of it); the one that was active is switched off. */
  async activate(id: string, by: string | null) {
    const result = await this.validate(id);
    if (!result.ok)
      throw new Problem(
        422,
        'The workflow is not ready: ' + result.issues.filter(i => i.level === 'error').map(i => i.message).join(' '),
        result.issues.filter(i => i.level === 'error').map(i => ({field: 'workflow', detail: i.message})),
      );
    await this.db.transaction(async conn => {
      const row = await this.lockWorkflow(conn, id);
      ensure(!row.is_active, 'This workflow is already active', 409);
      ensure(await this.freezes.latestWorkflowFreezeId(row.code, conn), 'This workflow has no freeze yet. Save it first.', 409);
      const [[was]] = await conn.query<any[]>(`SELECT name FROM ${CRM.workflows} WHERE is_active=1 LIMIT 1`);
      await conn.execute(`UPDATE ${CRM.workflows} SET is_active=0 WHERE is_active=1`);
      await conn.execute(`UPDATE ${CRM.workflows} SET is_active=1,updated_by=? WHERE id=?`, [by, id]);
      await this.freezes.logWorkflow(conn, row.code, row.name, 'ACTIVATE', was ? `Set active (new applications start here now; before: ${was.name})` : 'Set active (new applications start here now)', by);
    });
    return this.get(id);
  }

  /** Switches the active workflow off. New applications cannot start until another one is set active. */
  async deactivate(id: string, by: string | null) {
    await this.db.transaction(async conn => {
      const row = await this.lockWorkflow(conn, id);
      ensure(row.is_active, 'Only the active workflow can be switched off', 409);
      await conn.execute(`UPDATE ${CRM.workflows} SET is_active=0,updated_by=? WHERE id=?`, [by, id]);
      await this.freezes.logWorkflow(conn, row.code, row.name, 'DEACTIVATE', 'Switched off (no new application can start until a workflow is set active)', by);
    });
    return this.get(id);
  }

  /** Deletes the master workflow. Its freezes stay (frozen tables have no foreign keys), so applications on them keep running. */
  async remove(id: string, by: string | null = null) {
    await this.db.transaction(async conn => {
      const row = await this.lockWorkflow(conn, id);
      ensure(!row.is_active, 'The active workflow cannot be deleted. Set another workflow active first.', 409);
      await this.clear(conn, row.code);
      await conn.execute(`DELETE FROM ${CRM.workflows} WHERE id=?`, [id]);
      await this.freezes.logWorkflow(conn, row.code, row.name, 'DELETE', `Deleted the workflow ${row.name} (its versions and the applications on them stay)`, by);
    });
    return {removed: id};
  }

  /** The versions of a workflow, newest first: when, by whom, what changed against the version before it, and the applications on each. */
  async history(id: string) {
    const {workflow} = await this.get(id);
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT id,freeze_version,frozen_at,frozen_by_name,name,is_latest_freeze FROM ${CRM.frozenWorkflows} WHERE source_workflow_code=? ORDER BY freeze_version ASC`,
      [workflow.code],
    );
    const apps = await this.freezes.applicationsOn(rows.map(r => r.id));
    const out = [];
    let before: VersionContent | null = null;
    for (const r of rows) {
      const content = await this.versionContent(r);
      const changes = before ? diffVersions(before, content) : null;
      before = content;
      const used = apps.get(r.id) ?? {total: 0, items: []};
      out.push({
        id: r.id,
        freezeVersion: Number(r.freeze_version),
        at: r.frozen_at,
        by: r.frozen_by_name,
        name: r.name,
        isLatest: !!r.is_latest_freeze,
        action: changes ? 'EDITED' : 'CREATED',
        changes,
        summary: summarize(changes),
        counts: {groups: content.groups.length, stages: content.stages.length, fields: content.fields.length, documents: content.documents.length, approvals: content.approvals.length},
        applications: used.total,
        applicationList: used.items,
      });
    }
    return out.reverse();
  }

  /** What one freeze of a workflow contained and what changed against the version before it (read from the frozen tables only). */
  async version(id: string, freezeId: string) {
    const {workflow} = await this.get(id);
    const heads = async (sql: string, p: unknown[]) => (await this.db.pool.query<any[]>(sql, p))[0];
    const [head] = await heads(`SELECT id,freeze_version,frozen_at,frozen_by_name,name,is_latest_freeze FROM ${CRM.frozenWorkflows} WHERE id=? AND source_workflow_code=?`, [freezeId, workflow.code]);
    if (!head) throw new Problem(404, 'That version does not belong to this workflow.');
    const [before] = await heads(
      `SELECT id,freeze_version,frozen_at,frozen_by_name,name,is_latest_freeze FROM ${CRM.frozenWorkflows} WHERE source_workflow_code=? AND freeze_version<? ORDER BY freeze_version DESC LIMIT 1`,
      [workflow.code, head.freeze_version],
    );
    const content = await this.versionContent(head);
    return {...content, previous: before ? {id: before.id, freezeVersion: Number(before.freeze_version)} : null, changes: before ? diffVersions(await this.versionContent(before), content) : null};
  }

  private async versionContent(head: any): Promise<VersionContent & {freeze: any; stages: any[]; fields: any[]}> {
    const freezeId = head.id;
    const q = async (sql: string) => (await this.db.pool.query<any[]>(sql, [freezeId]))[0];
    const groups = await q(`SELECT code,name,sort_order FROM ${CRM.frozenWorkflowStageGroups} WHERE workflow_freeze_id=? ORDER BY sort_order,name`);
    const stages = await q(`SELECT code,group_code,name,department_code,form_code,sort_order FROM ${CRM.frozenWorkflowStages} WHERE workflow_freeze_id=? ORDER BY sort_order,name`);
    const fields = await q(
      `SELECT sf.stage_code,sf.is_mandatory,sf.form_field_code AS code,ff.label,ff.form_code,fs.name AS section_name FROM ${CRM.frozenWorkflowStageFields} sf
       LEFT JOIN ${CRM.masterFormFields} ff ON ff.code=sf.form_field_code LEFT JOIN ${CRM.masterFormSections} fs ON fs.code=ff.section_code WHERE sf.workflow_freeze_id=? ORDER BY sf.stage_code,ff.sort_order`,
    );
    const documents = await q(
      `SELECT sd.stage_code,sd.document_code,sd.is_default,sd.is_mandatory,t.name FROM ${CRM.frozenWorkflowStageDocuments} sd
       LEFT JOIN ${CRM.masterDocumentTypes} t ON t.code=sd.document_code WHERE sd.workflow_freeze_id=? ORDER BY sd.sort_order`,
    );
    const approvals = await q(
      `SELECT a.approval_freeze_id,a.scope_type,a.group_code,a.stage_code,a.section_code,a.document_code,a.approval_code,fa.name AS approval_name,fa.freeze_version AS approval_version,
              (SELECT GROUP_CONCAT(CONCAT(l.level_no,': ',IF(l.is_pic_marketing=1,'PIC Marketing',l.authority_name)) ORDER BY l.level_no SEPARATOR '; ') FROM ${CRM.frozenApprovalLevels} l WHERE l.approval_freeze_id=a.approval_freeze_id) AS levels
       FROM ${CRM.frozenWorkflowApprovalAssignments} a LEFT JOIN ${CRM.frozenApprovals} fa ON fa.id=a.approval_freeze_id WHERE a.workflow_freeze_id=? ORDER BY a.scope_type,a.code`,
    );
    const approvalIds = [...new Set(approvals.map(a => a.approval_freeze_id as string))];
    const levelRows = approvalIds.length
      ? (await this.db.pool.query<any[]>(`SELECT approval_freeze_id,level_no,authority_name,is_pic_marketing FROM ${CRM.frozenApprovalLevels} WHERE approval_freeze_id IN (${approvalIds.map(() => '?').join(',')}) ORDER BY level_no,is_pic_marketing,authority_name`, approvalIds))[0]
      : [];
    return {
      freeze: {id: head.id, freezeVersion: Number(head.freeze_version), at: head.frozen_at, by: head.frozen_by_name, name: head.name, isLatest: !!head.is_latest_freeze},
      groups: groups.map(g => ({code: g.code, name: g.name, order: Number(g.sort_order)})),
      stages: stages.map(s => ({code: s.code, groupCode: s.group_code, name: s.name, departmentCode: s.department_code, formCode: s.form_code, order: Number(s.sort_order)})),
      fields: fields.map(f => ({stageCode: f.stage_code, formCode: f.form_code, section: f.section_name ?? '', code: f.code, label: f.label ?? f.code, mandatory: !!f.is_mandatory})),
      documents: documents.map(d => ({stageCode: d.stage_code, code: d.document_code, name: d.name ?? d.document_code, isDefault: !!d.is_default, isMandatory: !!d.is_mandatory})),
      approvals: approvals.map(a => ({scope: a.scope_type, groupCode: a.group_code, stageCode: a.stage_code, sectionCode: a.section_code, documentCode: a.document_code, approvalCode: a.approval_code, approvalName: a.approval_name ?? a.approval_code, approvalVersion: a.approval_version == null ? null : Number(a.approval_version), levels: a.levels ?? '', levelList: levelRows.filter(l => l.approval_freeze_id === a.approval_freeze_id).map(l => ({levelNo: Number(l.level_no), authorityName: l.authority_name ?? '', isPicMarketing: !!l.is_pic_marketing}))})),
    };
  }

  /** The applications running on one version of a workflow (paged, searchable). */
  async versionApplications(id: string, freezeId: string, search: string, page: number) {
    const {workflow} = await this.get(id);
    const [[head]] = await this.db.pool.query<any[]>(`SELECT id FROM ${CRM.frozenWorkflows} WHERE id=? AND source_workflow_code=?`, [freezeId, workflow.code]);
    if (!head) throw new Problem(404, 'That version does not belong to this workflow.');
    return this.freezes.applicationsPage([freezeId], search, page);
  }

  /** The log of workflows: every create, save, rename, activation and deletion, newest first. One workflow (by id) or all of them (also the deleted ones). */
  async activity(id?: string) {
    let code: string | null = null;
    if (id) code = (await this.get(id)).workflow.code;
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT workflow_code,workflow_name,action,summary,freeze_version,actor_name,acted_at FROM ${CRM.workflowLogs}${code ? ' WHERE workflow_code=?' : ''} ORDER BY acted_at DESC,id LIMIT 500`,
      code ? [code] : [],
    );
    return rows.map(r => ({code: r.workflow_code as string, name: r.workflow_name as string | null, action: r.action as string, summary: r.summary as string, version: r.freeze_version == null ? null : Number(r.freeze_version), by: r.actor_name as string | null, at: r.acted_at as string}));
  }
}
