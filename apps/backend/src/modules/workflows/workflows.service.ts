import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {Problem, ensure} from '../../core/domain';
import {WorkflowConfigRepository} from '../applications/workflow/workflow-config.repository';
import {DocumentsRepository} from '../documents/documents.repository';
import {UsersNamesLookup} from '../approvals/users-names.lookup';
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
type Actor = {name?: string; username?: string; portalUserId?: number};
const uuid = () => crypto.randomUUID();


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
    private readonly users: UsersNamesLookup,
    private readonly approvers: UsersApproversLookup,
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
    const [approvals] = await this.db.pool.query<any[]>(`SELECT code,name,status FROM ${CRM.masterApprovals} ORDER BY name,code`);
    const [levels] = await this.db.pool.query<any[]>(`SELECT approval_code,level_no,authority_name FROM ${CRM.masterApprovalLevels} ORDER BY approval_code,level_no,authority_name`);
    return approvals.map(a => ({
      code: a.code,
      name: a.name,
      /** Only an ACTIVE approval can be chosen for a place (one already chosen in the workflow stays). */
      status: a.status as 'DRAFT' | 'ACTIVE' | 'INACTIVE',
      levels: levels.filter(l => l.approval_code === a.code).map(l => ({levelNo: Number(l.level_no), authorityName: l.authority_name})),
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
      `SELECT s.*,g.code AS group_code FROM ${CRM.workflowStages} s JOIN ${CRM.workflowStageGroups} g ON g.id=s.stage_group_id
       WHERE s.workflow_code=? ORDER BY g.sort_order,g.name,s.sort_order,s.name`,
    );
    const fields = await q(
      `SELECT s.code AS stage_code,ff.form_code,fs.name AS section_name,ff.code,sf.is_mandatory FROM ${CRM.workflowStageFields} sf
       JOIN ${CRM.workflowStages} s ON s.id=sf.stage_id JOIN ${CRM.masterFormFields} ff ON ff.code=sf.form_field_code
       JOIN ${CRM.masterFormSections} fs ON fs.code=ff.section_code
       WHERE sf.workflow_code=?`,
    );
    const documents = await q(
      `SELECT s.code AS stage_code,t.code AS document_code,sd.is_default,sd.is_mandatory FROM ${CRM.workflowStageDocuments} sd
       JOIN ${CRM.workflowStages} s ON s.id=sd.stage_id JOIN ${CRM.masterDocumentTypes} t ON t.id=sd.document_type_id
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

  /**
   * A new draft with the same groups, stages, required fields, documents and approvals, as a starting point for a change: a workflow that applications
   * run on is never edited, it is cloned, changed and activated (the running applications keep the one they started in).
   */
  async clone(id: string, by: string | null) {
    const {workflow, definition} = await this.get(id);
    const created = await this.create({name: `${workflow.name} (copy)`.slice(0, 150), description: workflow.description}, by);
    await this.db.transaction(async conn => {
      await this.write(conn, created.workflow.code, definition, by);
    });
    return this.get(created.workflow.id);
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
      if (s.departmentCode && !(await this.departments()).some(d => d.code === s.departmentCode))
        issues.push({level: 'error', message: `Stage "${s.name}" has a department that does not exist (${s.departmentCode}).`});
    // a stage may only show a form of the master form list
    const formCodes = new Set((await this.forms()).map(f => f.code));
    for (const st of def.stages) if (st.formCode && !formCodes.has(st.formCode)) issues.push({level: 'error', message: `Stage "${st.name}" shows a form that does not exist (${st.formCode}).`});
    // an approval points at an existing master approval, on a place that is flagged is_approval in the masters (the registry)
    const registry = await this.registry();
    // an approval can be chosen only while it is ACTIVE; one this workflow already uses may stay (it was chosen when it was active)
    const [already] = await this.db.pool.query<any[]>(`SELECT approval_code FROM ${CRM.workflowApprovalAssignments} WHERE workflow_code=(SELECT code FROM ${CRM.workflows} WHERE id=?)`, [id]);
    const kept = new Set(already.map(r => r.approval_code as string));
    for (const a of def.approvals) {
      const status = registry.approvals.get(a.approvalCode);
      if (!status) issues.push({level: 'error', message: `The approval ${a.approvalCode} does not exist in Master approval.`});
      else if (status !== 'ACTIVE' && !kept.has(a.approvalCode)) issues.push({level: 'error', message: `The approval ${a.approvalCode} is ${status.toLowerCase()}; only an active approval can be chosen.`});
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

  /** The registry: which forms, sections and documents may have an approval (the is_approval flag of the masters). */
  private async registry() {
    const [forms] = await this.db.pool.query<any[]>(`SELECT code,is_approval FROM ${CRM.masterForms}`);
    const [sections] = await this.db.pool.query<any[]>(`SELECT code,name,form_code,is_approval FROM ${CRM.masterFormSections}`);
    const [docs] = await this.db.pool.query<any[]>(`SELECT code,is_approval FROM ${CRM.masterDocumentTypes}`);
    const [approvals] = await this.db.pool.query<any[]>(`SELECT code,status FROM ${CRM.masterApprovals}`);
    return {
      forms: new Map<string, boolean>(forms.map(f => [f.code, !!f.is_approval])),
      sections: new Map(sections.map(x => [x.code as string, {name: x.name as string, formCode: x.form_code as string, isApproval: !!x.is_approval}])),
      documents: new Map<string, boolean>(docs.map(d => [d.code, !!d.is_approval])),
      approvals: new Map<string, string>(approvals.map(a => [a.code as string, a.status as string])),
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
    const groupId = new Map<string, string>();
    const groupCodes = new Map<string, string>();
    const groupTaken = new Set<string>();
    for (const g of def.groups) {
      const gid = uuid();
      groupId.set(g.key, gid);
      const gcode = this.uniqueCode(groupTaken, g.code, g.name, 50, 'GROUP');
      groupCodes.set(g.key, gcode);
      await conn.execute(
        `INSERT INTO ${CRM.workflowStageGroups} (id,workflow_code,code,name,sort_order,created_by)
         VALUES (?,?,?,?,?,?)`,
        [gid, workflowCode, gcode, g.name, g.order, by],
      );
    }
    const stageId = new Map<string, string>();
    const stageCodes = new Map<string, string>();
    const stageTaken = new Set<string>();
    for (const s of def.stages) {
      const sid = uuid();
      stageId.set(s.key, sid);
      const scode = this.uniqueCode(stageTaken, s.code, s.name, 50, 'STAGE');
      stageCodes.set(s.key, scode);
      await conn.execute(
        `INSERT INTO ${CRM.workflowStages} (id,workflow_code,stage_group_id,group_code,code,name,department_code,sort_order,form_code,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [sid, workflowCode, groupId.get(s.groupKey)!, groupCodes.get(s.groupKey)!, scode, s.name, s.departmentCode || null, s.order, s.formCode || null, by],
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
        `INSERT INTO ${CRM.workflowStageFields} (id,workflow_code,stage_id,stage_code,form_field_code,is_mandatory,created_by) VALUES (?,?,?,?,?,?,?)`,
        [uuid(), workflowCode, stageId.get(f.stageKey)!, stageCodes.get(f.stageKey)!, f.code, +f.mandatory, by],
      );
    }
    const stageGroup = new Map(def.stages.map(s => [s.key, s.groupKey]));
    const docRowId = new Map<string, string>();
    for (const [i, d] of def.documents.entries()) {
      const [rows] = await conn.query<any[]>(`SELECT id FROM ${CRM.masterDocumentTypes} WHERE code=?`, [d.documentCode]);
      const wid = uuid();
      docRowId.set(`${d.stageKey}|${d.documentCode}`, wid);
      await conn.execute(
        `INSERT INTO ${CRM.workflowStageDocuments} (id,workflow_code,group_id,group_code,stage_id,stage_code,document_type_id,document_code,is_default,is_mandatory,sort_order,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [wid, workflowCode, groupId.get(stageGroup.get(d.stageKey)!)!, groupCodes.get(stageGroup.get(d.stageKey)!)!, stageId.get(d.stageKey)!, stageCodes.get(d.stageKey)!, rows[0].id, d.documentCode, +d.isDefault, +d.isMandatory, i, by],
      );
    }
    // The approvals: one row per place, pointing at a master approval. The code names the place (group, stage, section or document).
    for (const a of def.approvals) {
      const gcode = a.scope === 'GROUP' ? groupCodes.get(a.groupKey!)! : null;
      const scode = a.scope === 'GROUP' ? null : stageCodes.get(a.stageKey!)!;
      const place = a.scope === 'GROUP' ? gcode : a.scope === 'STAGE' ? scode : a.scope === 'SECTION' ? `${scode}-${a.sectionCode}` : `${scode}-${a.documentCode}`;
      await conn.execute(
        `INSERT INTO ${CRM.workflowApprovalAssignments}
           (id,workflow_code,code,scope_type,section_code,stage_group_id,stage_id,workflow_stage_document_id,group_code,stage_code,document_code,approval_code,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          uuid(),
          workflowCode,
          `${a.scope}-${place}`.slice(0, 110),
          a.scope,
          a.scope === 'SECTION' ? a.sectionCode! : null,
          a.scope === 'GROUP' ? groupId.get(a.groupKey!)! : null,
          a.scope === 'STAGE' || a.scope === 'SECTION' ? stageId.get(a.stageKey!)! : null,
          a.scope === 'DOCUMENT' ? docRowId.get(`${a.stageKey}|${a.documentCode}`)! : null,
          gcode,
          scode,
          a.scope === 'DOCUMENT' ? a.documentCode! : null,
          a.approvalCode,
          by,
        ],
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
