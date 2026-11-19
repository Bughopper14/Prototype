import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import {z} from 'zod';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM, crmTable} from '../../core/db/crm-tables';
import {Problem, ensure} from '../../core/domain';
import {toCode} from '../../core/domain/code';
import {UsersNamesLookup} from '../approvals/users-names.lookup';

const HISTORY = crmTable('workflow_approval_history');

export const approvalInput = z.object({
  name: z.string().trim().min(1, 'Give the approval a name').max(100),
  description: z.string().trim().max(500).nullish(),
  /** The levels: levels run in ascending levelNo; rows with the same levelNo run in parallel. One authority per row. */
  levels: z
    .array(
      z.object({
        levelNo: z.number().int().min(1).max(100),
        authorityName: z.string().trim().min(1, 'Choose who approves').max(100),
      }),
    )
    .min(1, 'An approval needs at least one level'),
});
export type ApprovalInput = z.infer<typeof approvalInput>;

/**
 * Master approval: an approval that stands on its own, outside any workflow. It is a code, a name and levels; a level names an
 * authority (free text made in User Management; this file only stores the name and never writes users tables). A workflow only points
 * at an approval code.
 *
 * An approval has a STATUS like a workflow: DRAFT (editable, not selectable in a workflow), ACTIVE (locked, selectable) or INACTIVE (locked,
 * not selectable for new places; what already uses it keeps running). An approval is never changed while it is live: to change an active one it
 * is CLONED into a new independent DRAFT which is edited and activated; the workflow that should use it is cloned too.
 */
@Injectable()
export class MasterApprovalsService {
  constructor(
    private readonly db: CrmDatabase,
    private readonly users: UsersNamesLookup,
  ) {}

  /** The authorities a level can use (from User Management). */
  authorities() {
    return this.users.approvalAuthorities();
  }

  async list() {
    const [approvals] = await this.db.pool.query<any[]>(
      `SELECT a.*,(SELECT COUNT(*) FROM ${CRM.workflowApprovalAssignments} x WHERE x.approval_code=a.code) AS used_in,
              (SELECT COUNT(*) FROM ${CRM.applications} ap WHERE ap.deleted_at IS NULL AND ap.workflow_code IN
                (SELECT DISTINCT x.workflow_code FROM ${CRM.workflowApprovalAssignments} x WHERE x.approval_code=a.code)) AS apps
       FROM ${CRM.masterApprovals} a ORDER BY a.name,a.code`,
    );
    const [levels] = await this.db.pool.query<any[]>(
      `SELECT approval_code,level_no,authority_name FROM ${CRM.masterApprovalLevels} ORDER BY approval_code,level_no,authority_name`,
    );
    // the workflows that use each approval (to open them from the card)
    const [uses] = await this.db.pool.query<any[]>(
      `SELECT DISTINCT a.approval_code,w.id,w.name,w.status FROM ${CRM.workflowApprovalAssignments} a JOIN ${CRM.workflows} w ON w.code=a.workflow_code ORDER BY w.name`,
    );
    return approvals.map(a => ({
      ...this.shape(a, levels.filter(l => l.approval_code === a.code)),
      workflows: uses.filter(u => u.approval_code === a.code).map(u => ({id: u.id as string, name: u.name as string, status: u.status as string})),
    }));
  }

  async get(code: string) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT a.*,(SELECT COUNT(*) FROM ${CRM.workflowApprovalAssignments} x WHERE x.approval_code=a.code) AS used_in,
              (SELECT COUNT(*) FROM ${CRM.applications} ap WHERE ap.deleted_at IS NULL AND ap.workflow_code IN
                (SELECT DISTINCT x.workflow_code FROM ${CRM.workflowApprovalAssignments} x WHERE x.approval_code=a.code)) AS apps
       FROM ${CRM.masterApprovals} a WHERE a.code=?`,
      [code],
    );
    ensure(rows[0], 'Approval not found', 404);
    const [levels] = await this.db.pool.query<any[]>(
      `SELECT approval_code,level_no,authority_name FROM ${CRM.masterApprovalLevels} WHERE approval_code=? ORDER BY level_no,authority_name`,
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
      status: a.status as 'DRAFT' | 'ACTIVE' | 'INACTIVE',
      activatedAt: (a.activated_at ?? null) as Date | null,
      activatedBy: (a.activated_by ?? null) as string | null,
      /** Applications still running on a workflow that uses this approval. */
      applications: Number(a.apps ?? 0),
      levels: levels.map(l => ({levelNo: Number(l.level_no), authorityName: l.authority_name as string})),
    };
  }

  /** The workflow places that point at this approval. */
  private async usedBy(code: string) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT a.workflow_code,w.name AS workflow_name,w.status AS workflow_status,a.scope_type,a.group_code,g.name AS group_name,a.stage_code,s.name AS stage_name,
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
      workflowStatus: (r.workflow_status ?? null) as string | null,
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
    const missing = [...new Set(input.levels.map(l => l.authorityName))].filter(n => !known.has(n));
    if (missing.length)
      throw new Problem(
        422,
        `The authority ${missing.join(', ')} does not exist in User Management (or does not start with CRM_ and end with APPROVE, APPROVAL or APPROVER). Create it there first.`,
      );
    const seen = new Set<string>();
    for (const l of input.levels) {
      const key = `${l.levelNo}|${l.authorityName}`;
      if (seen.has(key)) throw new Problem(422, `Level ${l.levelNo} lists the authority ${l.authorityName} twice.`);
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

  private describe(levels: {levelNo: number; authorityName: string}[]) {
    return [...levels].sort((a, b) => a.levelNo - b.levelNo).map(l => `${l.levelNo}: ${l.authorityName}`).join('; ');
  }

  async create(raw: unknown, by: string | null) {
    const parsed = approvalInput.safeParse(raw);
    if (!parsed.success) throw new Problem(422, parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
    const input = parsed.data;
    const apps = await this.checkAuthorities(input);
    const code = await this.nextCode(input.name);
    await this.db.transaction(async conn => {
      await conn.execute(`INSERT INTO ${CRM.masterApprovals} (id,code,name,approval_type,status,description,created_by) VALUES (?,?,?,'SEQUENTIAL','DRAFT',?,?)`, [
        crypto.randomUUID(),
        code,
        input.name,
        input.description || null,
        by,
      ]);
      await this.writeLevels(conn, code, input, apps, by);
      await this.log(conn, code, 'ADDED', `Added ${input.name}`, null, this.describe(input.levels), by);
    });
    return this.get(code);
  }

  async update(code: string, raw: unknown, by: string | null) {
    const parsed = approvalInput.safeParse(raw);
    if (!parsed.success) throw new Problem(422, parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
    const input = parsed.data;
    const before = await this.get(code);
    ensure(before.status === 'DRAFT', 'Only a draft can be edited. Clone this approval to change it.', 409);
    const apps = await this.checkAuthorities(input);
    await this.db.transaction(async conn => {
      await conn.execute(`UPDATE ${CRM.masterApprovals} SET name=?,description=?,updated_by=? WHERE code=?`, [input.name, input.description || null, by, code]);
      await conn.execute(`DELETE FROM ${CRM.masterApprovalLevels} WHERE approval_code=?`, [code]);
      await this.writeLevels(conn, code, input, apps, by);
      await this.log(conn, code, 'CHANGED', `Changed ${input.name}`, this.describe(before.levels), this.describe(input.levels), by);
    });
    return this.get(code);
  }

  /** An approval that a workflow still points at cannot be removed. */
  async remove(code: string, by: string | null) {
    const before = await this.get(code);
    ensure(before.status === 'DRAFT', 'Only a draft can be removed. Deactivate it instead.', 409);
    ensure(before.usedIn === 0, `This approval is used in ${before.usedIn} place(s) of workflows, so it cannot be removed. Point those places at another approval first.`, 409);
    await this.db.transaction(async conn => {
      await conn.execute(`DELETE FROM ${CRM.masterApprovals} WHERE code=?`, [code]);
      await this.log(conn, code, 'REMOVED', `Removed ${before.name}`, this.describe(before.levels), null, by);
    });
    return {removed: code};
  }

  private async writeLevels(conn: {execute: (sql: string, args: any[]) => Promise<unknown>}, code: string, input: ApprovalInput, apps: Map<string, number>, by: string | null) {
    for (const l of input.levels)
      await conn.execute(
        `INSERT INTO ${CRM.masterApprovalLevels} (id,approval_code,level_no,app_id,authority_name,created_by) VALUES (?,?,?,?,?,?)`,
        [crypto.randomUUID(), code, l.levelNo, apps.get(l.authorityName)!, l.authorityName, by],
      );
  }

  private async log(conn: {execute: (sql: string, args: any[]) => Promise<unknown>}, code: string, action: 'ADDED' | 'CHANGED' | 'REMOVED', summary: string, before: string | null, after: string | null, by: string | null) {
    await conn.execute(
      `INSERT INTO ${HISTORY} (id,subject_type,subject_code,action,summary,before_text,after_text,created_by) VALUES (?,?,?,?,?,?,?,?)`,
      [crypto.randomUUID(), 'APPROVAL', code, action, summary.slice(0, 500), before, after, by],
    );
  }

  /** An independent DRAFT copy (levels included) with its own name and code: the way to change a locked approval. */
  async clone(code: string, by: string | null) {
    const src = await this.get(code);
    const name = `${src.name} (copy)`.slice(0, 100);
    const newCode = await this.nextCode(name);
    await this.db.transaction(async conn => {
      await conn.execute(`INSERT INTO ${CRM.masterApprovals} (id,code,name,approval_type,status,description,created_by) VALUES (?,?,?,'SEQUENTIAL','DRAFT',?,?)`, [crypto.randomUUID(), newCode, name, src.description, by]);
      const [levels] = await conn.query<any[]>(`SELECT level_no,app_id,authority_name FROM ${CRM.masterApprovalLevels} WHERE approval_code=?`, [src.code]);
      for (const l of levels)
        await conn.execute(`INSERT INTO ${CRM.masterApprovalLevels} (id,approval_code,level_no,app_id,authority_name,created_by) VALUES (?,?,?,?,?,?)`, [crypto.randomUUID(), newCode, l.level_no, l.app_id, l.authority_name, by]);
      await this.log(conn, newCode, 'ADDED', `Copied from ${src.name}`, null, this.describe(src.levels), by);
    });
    return this.get(newCode);
  }

  /** DRAFT -> ACTIVE: locked from now on and selectable in a workflow. Every authority must still exist in User Management. */
  async activate(code: string, by: string | null) {
    const a = await this.get(code);
    ensure(a.status === 'DRAFT', a.status === 'ACTIVE' ? 'This approval is already active.' : 'Clone an inactive approval to use it again.', 409);
    await this.checkAuthorities({name: a.name, levels: a.levels.map(l => ({levelNo: l.levelNo, authorityName: l.authorityName}))});
    await this.db.transaction(async conn => {
      await conn.execute(`UPDATE ${CRM.masterApprovals} SET status='ACTIVE',activated_at=CURRENT_TIMESTAMP(3),activated_by=?,updated_by=? WHERE code=?`, [by, by, code]);
      await this.log(conn, code, 'CHANGED', 'Activated', 'DRAFT', 'ACTIVE', by);
    });
    return this.get(code);
  }

  /** ACTIVE -> INACTIVE: not selectable for new places; the places and applications that already use it are not touched. */
  async deactivate(code: string, by: string | null) {
    const a = await this.get(code);
    ensure(a.status === 'ACTIVE', 'Only an active approval can be deactivated.', 409);
    await this.db.transaction(async conn => {
      await conn.execute(`UPDATE ${CRM.masterApprovals} SET status='INACTIVE',updated_by=? WHERE code=?`, [by, code]);
      await this.log(conn, code, 'CHANGED', 'Deactivated', 'ACTIVE', 'INACTIVE', by);
    });
    return this.get(code);
  }

  async history(code: string) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT action,summary,before_text,after_text,created_at,created_by FROM ${HISTORY} WHERE subject_type='APPROVAL' AND subject_code=? ORDER BY created_at DESC`,
      [code],
    );
    return rows.map(r => ({action: r.action, summary: r.summary, before: r.before_text, after: r.after_text, at: r.created_at, by: r.created_by}));
  }
}
