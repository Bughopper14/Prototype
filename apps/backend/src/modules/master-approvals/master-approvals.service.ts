import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import {z} from 'zod';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {Problem, ensure} from '../../core/domain';
import {toCode} from '../../core/domain/code';
import {UsersNamesLookup} from '../approvals/users-names.lookup';
import {WorkflowFreezeRepository} from '../workflows/workflow-freeze.repository';

export const approvalInput = z.object({
  name: z.string().trim().min(1, 'Give the approval a name').max(100),
  description: z.string().trim().max(500).nullish(),
  /** The levels: levels run in ascending levelNo; rows with the same levelNo run in parallel. One authority per row, or the PIC Marketing of the application. */
  levels: z
    .array(
      z
        .object({
          levelNo: z.number().int().min(1).max(100),
          /** Empty when the approver of this row is the PIC Marketing of the application. */
          authorityName: z.string().trim().max(100).default(''),
          isPicMarketing: z.boolean().default(false),
        })
        .refine(l => l.isPicMarketing || l.authorityName.length > 0, {message: 'Choose who approves', path: ['authorityName']}),
    )
    .min(1, 'An approval needs at least one level'),
});
export type ApprovalInput = z.infer<typeof approvalInput>;

/**
 * Master approval: an approval that stands on its own, outside any workflow. It is a code, a name and levels; a level names an
 * authority (free text made in User Management; this file only stores the name and never writes users tables). A workflow only points
 * at an approval code.
 *
 * An approval can be edited at any time. Every create or edit makes a new freeze (see WorkflowFreezeRepository), and the workflows that use the
 * approval are frozen again so new applications get the change; applications already running keep the freeze they started with.
 */
@Injectable()
export class MasterApprovalsService {
  constructor(
    private readonly db: CrmDatabase,
    private readonly users: UsersNamesLookup,
    private readonly freezes: WorkflowFreezeRepository,
  ) {}

  /** The authorities a level can use (from User Management). */
  authorities() {
    return this.users.approvalAuthorities();
  }

  /** Places of the master workflows that point at the approval, and applications running on a workflow freeze that uses it. */
  private readonly usageColumns = `(SELECT COUNT(*) FROM ${CRM.workflowApprovalAssignments} x WHERE x.approval_code=a.code) AS used_in,
              (SELECT COUNT(*) FROM ${CRM.applications} ap WHERE ap.deleted_at IS NULL AND ap.workflow_freeze_id IN
                (SELECT DISTINCT x.freeze_id FROM ${CRM.frozenWorkflowApprovalAssignments} x WHERE x.approval_code=a.code)) AS apps`;

  async list() {
    const [approvals] = await this.db.pool.query<any[]>(
      `SELECT a.*,${this.usageColumns}
       FROM ${CRM.masterApprovals} a ORDER BY a.name,a.code`,
    );
    const [levels] = await this.db.pool.query<any[]>(
      `SELECT approval_code,level_no,authority_name,is_pic_marketing FROM ${CRM.masterApprovalLevels} ORDER BY approval_code,level_no,is_pic_marketing,authority_name`,
    );
    // the workflows that use each approval (to open them from the card)
    const [uses] = await this.db.pool.query<any[]>(
      `SELECT DISTINCT a.approval_code,w.id,w.name FROM ${CRM.workflowApprovalAssignments} a JOIN ${CRM.workflows} w ON w.code=a.workflow_code ORDER BY w.name`,
    );
    return approvals.map(a => ({
      ...this.shape(a, levels.filter(l => l.approval_code === a.code)),
      workflows: uses.filter(u => u.approval_code === a.code).map(u => ({id: u.id as string, name: u.name as string})),
    }));
  }

  async get(code: string) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT a.*,${this.usageColumns}
       FROM ${CRM.masterApprovals} a WHERE a.code=?`,
      [code],
    );
    ensure(rows[0], 'Approval not found', 404);
    const [levels] = await this.db.pool.query<any[]>(
      `SELECT approval_code,level_no,authority_name,is_pic_marketing FROM ${CRM.masterApprovalLevels} WHERE approval_code=? ORDER BY level_no,is_pic_marketing,authority_name`,
      [code],
    );
    const used = await this.usedBy(code);
    return {...this.shape(rows[0], levels), usedBy: used};
  }

  private shape(a: any, levels: any[]) {
    return {
      code: a.code as string,
      name: a.name as string,
      description: (a.description ?? null) as string | null,
      usedIn: Number(a.used_in ?? 0),
      /** Applications running on a workflow freeze that uses this approval. */
      applications: Number(a.apps ?? 0),
      levels: levels.map(l => ({levelNo: Number(l.level_no), authorityName: (l.authority_name ?? '') as string, isPicMarketing: !!l.is_pic_marketing})),
    };
  }

  /** The workflow places that point at this approval. */
  private async usedBy(code: string) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT a.workflow_code,w.name AS workflow_name,a.scope_type,a.group_code,g.name AS group_name,a.stage_code,s.name AS stage_name,
              a.section_code,ms.name AS section_name,a.document_code,dt.name AS document_name
       FROM ${CRM.workflowApprovalAssignments} a
       LEFT JOIN ${CRM.workflows} w ON w.code=a.workflow_code
       LEFT JOIN ${CRM.workflowStageGroups} g ON g.workflow_code=a.workflow_code AND g.code=a.group_code
       LEFT JOIN ${CRM.workflowStages} s ON s.workflow_code=a.workflow_code AND s.code=a.stage_code
       LEFT JOIN ${CRM.masterFormSections} ms ON ms.code=a.section_code
       LEFT JOIN ${CRM.masterDocumentTypes} dt ON dt.code=a.document_code
       WHERE a.approval_code=? ORDER BY w.name,a.scope_type`,
      [code],
    );
    return rows.map(r => ({
      workflowCode: r.workflow_code as string,
      workflowName: (r.workflow_name ?? r.workflow_code) as string,
      scope: r.scope_type as string,
      /** What the approval is on, in words: "Stage FAP Stage", "Section Legal Deeds & Amendments (in stage FAP Stage)"... */
      place:
        r.scope_type === 'GROUP'
          ? `Group ${r.group_name ?? r.group_code}`
          : r.scope_type === 'STAGE'
            ? `Stage ${r.stage_name ?? r.stage_code}`
            : r.scope_type === 'SECTION'
              ? `Section ${r.section_name ?? r.section_code} (stage ${r.stage_name ?? r.stage_code})`
              : `Document ${r.document_name ?? r.document_code} (stage ${r.stage_name ?? r.stage_code})`,
    }));
  }

  /** The authority names of the input must all exist in User Management; returns name → app id (a level keeps both). */
  private async checkAuthorities(input: ApprovalInput) {
    const known = new Map((await this.users.approvalAuthorities()).map(a => [a.name, a.appId]));
    const missing = [...new Set(input.levels.filter(l => !l.isPicMarketing).map(l => l.authorityName))].filter(n => !known.has(n));
    if (missing.length)
      throw new Problem(
        422,
        `The authority ${missing.join(', ')} does not exist in User Management (or does not start with CRM_ and end with APPROVE, APPROVAL or APPROVER). Create it there first.`,
      );
    const seen = new Set<string>();
    for (const l of input.levels) {
      const key = `${l.levelNo}|${l.isPicMarketing ? 'PIC' : l.authorityName}`;
      if (seen.has(key)) throw new Problem(422, `Level ${l.levelNo} lists the same approver twice.`);
      seen.add(key);
    }
    return known;
  }

  private async nextCode(name: string) {
    const base = toCode(name) || 'APPROVAL';
    for (let n = 1; ; n++) {
      const candidate = (n === 1 ? base : `${base}-${n}`).slice(0, 60);
      const [rows] = await this.db.pool.query<any[]>(`SELECT 1 FROM ${CRM.masterApprovals} WHERE code=?`, [candidate]);
      if (!rows.length) return candidate;
    }
  }

  private describe(levels: {levelNo: number; authorityName: string; isPicMarketing?: boolean}[]) {
    return [...levels].sort((a, b) => a.levelNo - b.levelNo).map(l => `${l.levelNo}: ${l.isPicMarketing ? 'PIC Marketing' : l.authorityName}`).join('; ');
  }

  async create(raw: unknown, by: string | null) {
    const parsed = approvalInput.safeParse(raw);
    if (!parsed.success) throw new Problem(422, parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
    const input = parsed.data;
    const apps = await this.checkAuthorities(input);
    const code = await this.nextCode(input.name);
    await this.db.transaction(async conn => {
      await conn.execute(`INSERT INTO ${CRM.masterApprovals} (id,code,name,approval_type,description,created_by) VALUES (?,?,?,'SEQUENTIAL',?,?)`, [
        crypto.randomUUID(),
        code,
        input.name,
        input.description || null,
        by,
      ]);
      await this.writeLevels(conn, code, input, apps, by);
      await this.log(conn, code, 'CREATE', `Created ${input.name}`, null, this.describe(input.levels), by);
      await this.freezes.freezeApproval(conn, code, by);
    });
    return this.get(code);
  }

  async update(code: string, raw: unknown, by: string | null) {
    const parsed = approvalInput.safeParse(raw);
    if (!parsed.success) throw new Problem(422, parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
    const input = parsed.data;
    const before = await this.get(code);
    const apps = await this.checkAuthorities(input);
    await this.db.transaction(async conn => {
      await conn.execute(`UPDATE ${CRM.masterApprovals} SET name=?,description=?,updated_by=? WHERE code=?`, [input.name, input.description || null, by, code]);
      await conn.execute(`DELETE FROM ${CRM.masterApprovalLevels} WHERE approval_code=?`, [code]);
      await this.writeLevels(conn, code, input, apps, by);
      await this.log(conn, code, 'UPDATE', `Changed ${input.name}`, this.describe(before.levels), this.describe(input.levels), by);
      await this.freezes.freezeApproval(conn, code, by);
      await this.freezes.refreezeWorkflowsUsing(conn, code, by);
    });
    return this.get(code);
  }

  /** An approval that a master workflow still points at cannot be removed. Its freezes stay. */
  async remove(code: string, by: string | null) {
    const before = await this.get(code);
    ensure(before.usedIn === 0, `This approval is used in ${before.usedIn} place(s) of workflows, so it cannot be removed. Point those places at another approval first.`, 409);
    await this.db.transaction(async conn => {
      await conn.execute(`DELETE FROM ${CRM.masterApprovals} WHERE code=?`, [code]);
      await this.log(conn, code, 'DELETE', `Removed ${before.name}`, this.describe(before.levels), null, by);
    });
    return {removed: code};
  }

  private async writeLevels(conn: {execute: (sql: string, args: any[]) => Promise<unknown>}, code: string, input: ApprovalInput, apps: Map<string, number>, by: string | null) {
    for (const l of input.levels)
      await conn.execute(
        `INSERT INTO ${CRM.masterApprovalLevels} (id,approval_code,level_no,app_id,authority_name,is_pic_marketing,created_by) VALUES (?,?,?,?,?,?,?)`,
        [crypto.randomUUID(), code, l.levelNo, l.isPicMarketing ? null : apps.get(l.authorityName)!, l.isPicMarketing ? null : l.authorityName, +l.isPicMarketing, by],
      );
  }

  private async log(conn: {execute: (sql: string, args: any[]) => Promise<unknown>}, code: string, action: 'CREATE' | 'UPDATE' | 'DELETE', summary: string, before: string | null, after: string | null, by: string | null) {
    await conn.execute(
      `INSERT INTO ${CRM.masterApprovalLogs} (id,approval_code,action,summary,before_text,after_text,actor_name) VALUES (?,?,?,?,?,?,?)`,
      [crypto.randomUUID(), code, action, summary.slice(0, 500), before, after, by],
    );
  }

  async history(code: string) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT action,summary,before_text,after_text,acted_at,actor_name FROM ${CRM.masterApprovalLogs} WHERE approval_code=? ORDER BY acted_at DESC`,
      [code],
    );
    return rows.map(r => ({action: r.action, summary: r.summary, before: r.before_text, after: r.after_text, at: r.acted_at, by: r.actor_name}));
  }
}
