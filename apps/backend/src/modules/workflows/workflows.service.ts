import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {Problem, ensure} from '../../core/domain';
import {isEnforceable} from '../applications/workflow/mandatory-check';
import {WorkflowConfigRepository} from '../applications/workflow/workflow-config.repository';
import {DocumentsRepository} from '../documents/documents.repository';
import {FORM_FIELDS, formField} from './form-fields';
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
type Actor = {name?: string; username?: string; portalUserId?: number};
const uuid = () => crypto.randomUUID();

/** Forms a stage can show. The fields of each form are in form-fields.ts. */
const FORMS = [{code: 'FAP-FORM', name: 'FAP form'}];

/**
 * Workflow setup: create, edit, activate, deactivate and soft-delete workflows. A workflow defines the stages of an
 * application and what each stage requires (fields, documents).
 *
 * A workflow is DRAFT (being built), ACTIVE (new applications start in it; only one) or INACTIVE (deactivated).
 * Applications that started in a workflow keep running on it, so only a draft that no application uses is edited; to change
 * a running workflow, build a new one and activate it. Nothing is hard-deleted.
 */
@Injectable()
export class WorkflowsService {
  constructor(
    private readonly db: CrmDatabase,
    private readonly config: WorkflowConfigRepository,
    private readonly documents: DocumentsRepository,
  ) {}

  /* ---------- reads ---------- */

  async list() {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT w.*,(SELECT COUNT(*) FROM ${CRM.applications} a WHERE a.workflow_code=w.code AND a.deleted_at IS NULL) AS applications
       FROM ${CRM.workflows} w
       ORDER BY FIELD(w.status,'ACTIVE','DRAFT','INACTIVE'),w.version_no DESC`,
    );
    // The groups of every workflow in running order, with their stages, for the flow shown on each card.
    const [stageRows] = await this.db.pool.query<any[]>(
      `SELECT g.workflow_code,g.id AS group_id,g.name AS group_name,g.sort_order AS group_order,s.name AS stage_name,s.sort_order AS stage_order
       FROM ${CRM.workflowStageGroups} g LEFT JOIN ${CRM.workflowStages} s ON s.stage_group_id=g.id
       ORDER BY g.sort_order,g.name,s.sort_order,s.name`,
    );
    const flow = new Map<string, {id: string; name: string; order: number; stages: {name: string; order: number}[]}[]>();
    for (const r of stageRows) {
      const groups = flow.get(r.workflow_code) || [];
      let g = groups.find(x => x.id === r.group_id);
      if (!g) groups.push((g = {id: r.group_id, name: r.group_name, order: Number(r.group_order), stages: []}));
      if (r.stage_name) g.stages.push({name: r.stage_name, order: Number(r.stage_order)});
      flow.set(r.workflow_code, groups);
    }
    return rows.map(r => ({...this.header(r), flow: (flow.get(r.code) || []).map(({name, order, stages}) => ({name, order, stages}))}));
  }

  private header(r: any) {
    const applications = r.applications === undefined ? undefined : Number(r.applications);
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      versionNo: Number(r.version_no),
      status: r.status as 'DRAFT' | 'ACTIVE' | 'INACTIVE',
      isActive: r.status === 'ACTIVE',
      /** Only a draft that no application uses can be edited. */
      editable: r.status === 'DRAFT' && !applications,
      activatedAt: r.activated_at,
      activatedBy: r.activated_by,
      applications,
      updatedAt: r.updated_at ?? r.created_at,
    };
  }

  async get(id: string) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT w.*,(SELECT COUNT(*) FROM ${CRM.applications} a WHERE a.workflow_code=w.code AND a.deleted_at IS NULL) AS applications
       FROM ${CRM.workflows} w WHERE w.id=?`,
      [id],
    );
    ensure(rows[0], 'Workflow not found', 404);
    return {workflow: this.header(rows[0]), definition: await this.definition(rows[0].code)};
  }

  /** Everything Workflow setup can choose from. */
  async catalog() {
    const [docs] = await this.db.pool.query<any[]>(
      `SELECT code,name FROM ${CRM.masterDocumentTypes} ORDER BY sort_order`,
    );
    return {
      formFields: FORM_FIELDS.map(f => ({
        formCode: f.form,
        section: f.section,
        code: f.code,
        label: f.label,
        enforceable: isEnforceable(f.section, f.key),
      })),
      forms: FORMS,
      documents: docs.map(d => ({code: d.code, name: d.name})),
      departments: await this.documents.departments(),
    };
  }

  /** The definition of a workflow in the shape the editor works with (an item's key is its code). */
  async definition(workflowCode: string, conn: Conn = this.db.pool): Promise<WorkflowDefinition & {groups: any[]; stages: any[]}> {
    const q = async (sql: string) => (await conn.query<any[]>(sql, [workflowCode]))[0];
    const groups = await q(`SELECT * FROM ${CRM.workflowStageGroups} WHERE workflow_code=? ORDER BY sort_order,name`);
    const stages = await q(
      `SELECT s.*,g.code AS group_code FROM ${CRM.workflowStages} s JOIN ${CRM.workflowStageGroups} g ON g.id=s.stage_group_id
       WHERE s.workflow_code=? ORDER BY g.sort_order,g.name,s.sort_order,s.name`,
    );
    const fields = await q(
      `SELECT s.code AS stage_code,ff.form_code,ff.section_name,ff.code,sf.is_mandatory FROM ${CRM.workflowStageFields} sf
       JOIN ${CRM.workflowStages} s ON s.id=sf.stage_id JOIN ${CRM.masterFormFields} ff ON ff.id=sf.form_field_id
       WHERE sf.workflow_code=?`,
    );
    const documents = await q(
      `SELECT s.code AS stage_code,t.code AS document_code,sd.is_default,sd.is_mandatory FROM ${CRM.workflowStageDocuments} sd
       JOIN ${CRM.workflowStages} s ON s.id=sd.stage_id JOIN ${CRM.masterDocumentTypes} t ON t.id=sd.document_type_id
       WHERE sd.workflow_code=? ORDER BY sd.sort_order`,
    );
    return {
      groups: groups.map(g => ({key: g.code, code: g.code, name: g.name, order: Number(g.sort_order)})),
      stages: stages.map(s => ({key: s.code, code: s.code, groupKey: s.group_code, name: s.name, departmentCode: s.department_code, order: Number(s.sort_order), formCode: s.form_code})),
      fields: fields.map(f => ({stageKey: f.stage_code, formCode: f.form_code, section: f.section_name, code: f.code, mandatory: !!f.is_mandatory})),
      documents: documents.map(d => ({stageKey: d.stage_code, documentCode: d.document_code, isDefault: !!d.is_default, isMandatory: !!d.is_mandatory})),
    };
  }

  /* ---------- drafts ---------- */

  private async lockDraft(conn: Conn, id: string, forEdit = false) {
    const [rows] = await conn.query<any[]>(`SELECT * FROM ${CRM.workflows} WHERE id=? FOR UPDATE`, [id]);
    ensure(rows[0], 'Workflow not found', 404);
    ensure(rows[0].status === 'DRAFT', 'Only a draft can be edited. Build a new workflow and activate it instead.', 409);
    if (forEdit) {
      const [[used]] = await conn.query<any[]>(`SELECT COUNT(*) AS n FROM ${CRM.applications} WHERE workflow_code=?`, [rows[0].code]);
      ensure(Number(used.n) === 0, 'Applications already run on this workflow, so it cannot be edited. Build a new workflow instead.', 409);
    }
    return rows[0];
  }

  /** A code that no workflow uses yet: the name as a code, with -2, -3... when it is taken. */
  private async freshWorkflowCode(conn: Conn, name: string) {
    const base = toCode(name) || 'WORKFLOW';
    for (let n = 1; ; n++) {
      const candidate = n === 1 ? base : `${base}-${n}`;
      const [rows] = await conn.query<any[]>(`SELECT 1 FROM ${CRM.workflows} WHERE code=?`, [candidate.slice(0, 50)]);
      if (!rows.length) return candidate.slice(0, 50);
    }
  }

  /** A new empty draft. */
  async create(input: {name: string; description?: string | null}, by: string | null) {
    ensure(String(input.name || '').trim(), 'Give the workflow a name', 422);
    const id = uuid();
    await this.db.transaction(async conn => {
      const [[max]] = await conn.query<any[]>(`SELECT COALESCE(MAX(version_no),0)+1 AS v FROM ${CRM.workflows}`);
      const code = await this.freshWorkflowCode(conn, input.name);
      await conn.execute(
        `INSERT INTO ${CRM.workflows} (id,code,name,description,version_no,status,created_by) VALUES (?,?,?,?,?,'DRAFT',?)`,
        [id, code, String(input.name).trim(), input.description || null, Number(max.v), by],
      );
      await this.write(conn, code, emptyDefinition(), by);
    });
    return this.get(id);
  }

  async rename(id: string, input: {name?: string; description?: string | null}, by: string | null) {
    await this.db.transaction(async conn => {
      await this.lockDraft(conn, id);
      if (input.name !== undefined) ensure(String(input.name).trim(), 'Give the workflow a name', 422);
      await conn.execute(`UPDATE ${CRM.workflows} SET name=COALESCE(?,name),description=?,updated_by=? WHERE id=?`, [
        input.name === undefined ? null : String(input.name).trim(),
        input.description ?? null,
        by,
        id,
      ]);
    });
    return this.get(id);
  }

  /** Replaces the whole definition of a draft. */
  async saveDefinition(id: string, raw: unknown, by: string | null) {
    const parsed = definitionSchema.safeParse(raw);
    if (!parsed.success) throw new Problem(422, parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
    const def = parsed.data;
    const issues = referenceIssues(def, await this.documentCodes()).filter(i => i.level === 'error');
    for (const s of def.stages)
      if (s.departmentCode && !(await this.documents.departmentExists(s.departmentCode)))
        issues.push({level: 'error', message: `Stage "${s.name}" has a department that does not exist (${s.departmentCode}).`});
    if (issues.length) throw new Problem(422, issues.map(i => i.message).join(' '), issues.map(i => ({field: 'workflow', detail: i.message})));
    let code = '';
    await this.db.transaction(async conn => {
      const row = await this.lockDraft(conn, id, true);
      code = row.code;
      await this.write(conn, code, def, by);
      await conn.execute(`UPDATE ${CRM.workflows} SET updated_by=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`, [by, id]);
    });
    this.config.forget(code);
    return this.get(id);
  }

  private async documentCodes(): Promise<Set<string>> {
    const [docs] = await this.db.pool.query<any[]>(`SELECT code FROM ${CRM.masterDocumentTypes}`);
    return new Set(docs.map(d => d.code));
  }

  private async clear(conn: Conn, workflowCode: string) {
    // stage fields first: they point at the field catalog rows that go with the stages
    for (const table of [CRM.workflowStageDocuments, CRM.workflowStageFields, CRM.workflowStages, CRM.workflowStageGroups])
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
    const groupId = new Map<string, string>();
    const groupTaken = new Set<string>();
    for (const g of def.groups) {
      const gid = uuid();
      groupId.set(g.key, gid);
      await conn.execute(
        `INSERT INTO ${CRM.workflowStageGroups} (id,workflow_code,code,name,sort_order,created_by)
         VALUES (?,?,?,?,?,?)`,
        [gid, workflowCode, this.uniqueCode(groupTaken, g.code, g.name, 50, 'GROUP'), g.name, g.order, by],
      );
    }
    const stageId = new Map<string, string>();
    const stageTaken = new Set<string>();
    for (const s of def.stages) {
      const sid = uuid();
      stageId.set(s.key, sid);
      await conn.execute(
        `INSERT INTO ${CRM.workflowStages} (id,workflow_code,stage_group_id,code,name,department_code,sort_order,form_code,created_by)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [sid, workflowCode, groupId.get(s.groupKey)!, this.uniqueCode(stageTaken, s.code, s.name, 50, 'STAGE'), s.name, s.departmentCode || null, s.order, s.formCode || null, by],
      );
    }
    for (const [i, f] of def.fields.entries()) {
      const known = formField(f.formCode, f.section, f.code);
      ensure(known, `Field ${f.section} / ${f.code} does not exist in the ${f.formCode} form`, 422);
      const fieldId = uuid();
      await conn.execute(
        `INSERT INTO ${CRM.masterFormFields} (id,stage_id,form_code,section_name,code,sort_order,created_by) VALUES (?,?,?,?,?,?,?)`,
        [fieldId, stageId.get(f.stageKey)!, f.formCode, f.section, f.code, i + 1, by],
      );
      await conn.execute(
        `INSERT INTO ${CRM.workflowStageFields} (id,workflow_code,stage_id,form_field_id,is_mandatory,created_by) VALUES (?,?,?,?,?,?)`,
        [uuid(), workflowCode, stageId.get(f.stageKey)!, fieldId, +f.mandatory, by],
      );
    }
    const stageGroup = new Map(def.stages.map(s => [s.key, s.groupKey]));
    for (const [i, d] of def.documents.entries()) {
      const [rows] = await conn.query<any[]>(`SELECT id FROM ${CRM.masterDocumentTypes} WHERE code=?`, [d.documentCode]);
      await conn.execute(
        `INSERT INTO ${CRM.workflowStageDocuments} (id,workflow_code,group_id,stage_id,document_type_id,is_default,is_mandatory,sort_order,created_by)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [uuid(), workflowCode, groupId.get(stageGroup.get(d.stageKey)!)!, stageId.get(d.stageKey)!, rows[0].id, +d.isDefault, +d.isMandatory, i, by],
      );
    }
  }

  /* ---------- activate / deactivate ---------- */

  /** Problems that stop an activation (errors) and things worth a look (warnings). */
  async validate(id: string): Promise<{ok: boolean; issues: Issue[]}> {
    const {definition} = await this.get(id);
    const issues = [...referenceIssues(definition, await this.documentCodes()), ...activationIssues(definition)];
    return {ok: !issues.some(i => i.level === 'error'), issues};
  }

  /** The workflow becomes the one new applications start in; the one that was active is deactivated. */
  async activate(id: string, actor: Actor, note?: string | null) {
    const result = await this.validate(id);
    if (!result.ok)
      throw new Problem(
        422,
        'The workflow is not ready: ' + result.issues.filter(i => i.level === 'error').map(i => i.message).join(' '),
        result.issues.filter(i => i.level === 'error').map(i => ({field: 'workflow', detail: i.message})),
      );
    let previous: string | null = null;
    let code = '';
    await this.db.transaction(async conn => {
      const [rows] = await conn.query<any[]>(`SELECT * FROM ${CRM.workflows} WHERE id=? FOR UPDATE`, [id]);
      ensure(rows[0], 'Workflow not found', 404);
      code = rows[0].code;
      ensure(rows[0].status !== 'ACTIVE', 'This workflow is already active', 409);
      const [active] = await conn.query<any[]>(`SELECT * FROM ${CRM.workflows} WHERE status='ACTIVE' FOR UPDATE`);
      const prev = active[0] ?? null;
      previous = prev?.code ?? null;
      if (prev) {
        await conn.execute(`UPDATE ${CRM.workflows} SET status='INACTIVE',updated_by=? WHERE id=?`, [actor.username || null, prev.id]);
        await this.log(conn, prev, null, 'DEACTIVATE', actor, note || null);
      }
      await conn.execute(
        `UPDATE ${CRM.workflows} SET status='ACTIVE',activated_at=CURRENT_TIMESTAMP(3),activated_by=?,updated_by=? WHERE id=?`,
        [actor.name || actor.username || null, actor.username || null, id],
      );
      await this.log(conn, rows[0], prev, 'ACTIVATE', actor, note || null);
    });
    this.config.forget(code);
    if (previous) this.config.forget(previous);
    return this.get(id);
  }

  /** Switches the active workflow off. New applications cannot start until another one is activated. */
  async deactivate(id: string, actor: Actor, note?: string | null) {
    let code = '';
    await this.db.transaction(async conn => {
      const [rows] = await conn.query<any[]>(`SELECT * FROM ${CRM.workflows} WHERE id=? FOR UPDATE`, [id]);
      ensure(rows[0], 'Workflow not found', 404);
      code = rows[0].code;
      ensure(rows[0].status === 'ACTIVE', 'Only the active workflow can be deactivated', 409);
      await conn.execute(`UPDATE ${CRM.workflows} SET status='INACTIVE',updated_by=? WHERE id=?`, [actor.username || null, id]);
      await this.log(conn, rows[0], null, 'DEACTIVATE', actor, note || null);
    });
    this.config.forget(code);
    return this.get(id);
  }

  /** The log keeps a snapshot of the workflow, so it stays complete when the workflow changes later. */
  private snapshot(w: any) {
    return JSON.stringify({id: w.id, code: w.code, name: w.name, versionNo: Number(w.version_no), status: w.status});
  }

  private async log(conn: Conn, workflow: any, previous: any | null, action: 'ACTIVATE' | 'DEACTIVATE' | 'DELETE', actor: Actor, note: string | null) {
    await conn.execute(
      `INSERT INTO ${CRM.workflowActivationLogs} (id,workflow_json,previous_workflow_json,action,actor_user_id,actor_name,note)
       VALUES (?,?,?,?,?,?,?)`,
      [
        uuid(),
        this.snapshot(workflow),
        previous ? this.snapshot(previous) : null,
        action,
        Number.isInteger(actor.portalUserId) ? (actor.portalUserId ?? null) : null,
        actor.name || actor.username || 'System',
        note,
      ],
    );
  }

  async history(id: string) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT action,actor_name,note,acted_at,previous_workflow_json FROM ${CRM.workflowActivationLogs}
       WHERE JSON_UNQUOTE(JSON_EXTRACT(workflow_json,'$.id'))=? ORDER BY acted_at DESC`,
      [id],
    );
    return rows.map(r => {
      const prev = typeof r.previous_workflow_json === 'string' ? JSON.parse(r.previous_workflow_json) : r.previous_workflow_json;
      return {action: r.action, actor: r.actor_name, note: r.note, at: r.acted_at, previous: prev?.name ?? null};
    });
  }
}
