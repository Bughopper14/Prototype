import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';
import {USER_TABLES} from '../../../core/db/user-tables';

type Conn = Pick<PoolConnection, 'query' | 'execute'>;
export type Actor = {id?: string; portalUserId?: number; name?: string; username?: string; role?: string};

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const actorId = (actor: Actor) => (Number.isInteger(actor.portalUserId) ? actor.portalUserId! : null);
const actorName = (actor: Actor) => actor.name || actor.username || 'System';

/**
 * Application header (crm_applications) and its workflow history: one stage_progress row per stage, one transition
 * row per status change, one signoff row per recommendation / committee decision.
 */
@Injectable()
export class ApplicationsRepository {
  constructor(private readonly db: CrmDatabase) {}

  get pool() {
    return this.db.pool;
  }

  /** Next registration number NNN/AF/<roman month>/<year>; the caller holds the per-year lock. */
  async nextFapNumber(conn: Conn, today: string) {
    const year = today.slice(0, 4);
    const [rows] = await conn.execute<any[]>(
      `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(fap_registration_number,'/',1) AS UNSIGNED)),0) AS n
       FROM ${CRM.fapApplicationProfiles} WHERE fap_registration_number LIKE ?`,
      [`%/AF/%/${year}`],
    );
    return `${String(Number(rows[0].n) + 1).padStart(3, '0')}/AF/${ROMAN_MONTHS[Number(today.slice(5, 7)) - 1]}/${year}`;
  }

  /** Sets the FAP number (stored on the FAP profile of the application); returns false when it already has one. */
  async setFapNumber(conn: Conn, id: string, fapNumber: string, actor: Actor) {
    const [res] = await conn.execute<any>(
      `UPDATE ${CRM.fapApplicationProfiles} SET fap_registration_number=?,updated_by=? WHERE application_id=? AND fap_registration_number IS NULL`,
      [fapNumber, actorName(actor), id],
    );
    return Number(res.affectedRows) === 1;
  }

  async insert(
    conn: Conn,
    app: {
      id: string;
      applicationDate: string;
      customerId: string;
      customerCategory: 'NEW' | 'EXISTING';
      branchId: string | null;
      statusId: string;
      workflowCode: string;
      mktPicId?: number | null;
    },
    actor: Actor,
  ) {
    await conn.execute(
      `INSERT INTO ${CRM.applications}
         (id,application_date,business_partner_id,customer_category,branch_id,current_status_id,
          workflow_code,mkt_pic_id,created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        app.id,
        app.applicationDate,
        app.customerId,
        app.customerCategory,
        app.branchId,
        app.statusId,
        app.workflowCode,
        app.mktPicId ?? null,
        actor.username || null,
      ],
    );
  }

  async get(id: string, conn: Conn = this.db.pool, forUpdate = false) {
    const [rows] = await conn.execute<any[]>(
      `SELECT a.*,
              u_pic.full_name AS mkt_pic_name, u_pic.username AS mkt_pic_username,
              p.fap_registration_number,p.is_fap_doc_uploaded,p.is_fap_form_locked,p.latest_freeze_version FROM ${CRM.applications} a
       LEFT JOIN ${CRM.fapApplicationProfiles} p ON p.application_id=a.id
       LEFT JOIN ${USER_TABLES.users} u_pic ON u_pic.id = a.mkt_pic_id
       WHERE a.id=? AND a.deleted_at IS NULL${forUpdate ? ' FOR UPDATE' : ''}`,
      [id],
    );
    return rows[0] || null;
  }

  async list() {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT a.*,
              u_pic.full_name AS mkt_pic_name, u_pic.username AS mkt_pic_username,
              p.fap_registration_number,p.is_fap_doc_uploaded,p.is_fap_form_locked,p.latest_freeze_version,p.company_name,p.business_category_id,p.nib,p.nib_date,p.npwp,p.establishment_act_no,
              p.establishment_date,p.company_address,p.city_id,p.province_id,p.postal_code_id,p.experience_years,
              p.experience_months,p.phone_fax,p.company_email,p.website,p.main_business,p.premise_status_id,
              p.repayment_source,p.latest_deed_no,p.latest_deed_date,p.industry_segment_id,p.business_role_id,
              p.asset_he_liugong,p.asset_truck_liugong,p.asset_he_non_liugong,p.asset_truck_non_liugong
       FROM ${CRM.applications} a
       LEFT JOIN ${CRM.fapApplicationProfiles} p ON p.application_id=a.id
       LEFT JOIN ${USER_TABLES.users} u_pic ON u_pic.id = a.mkt_pic_id
       WHERE a.deleted_at IS NULL ORDER BY a.created_at DESC`,
    );
    return rows;
  }

  async update(conn: Conn, id: string, values: Record<string, any>, by: string | null) {
    const keys = Object.keys(values);
    if (!keys.length) return;
    await conn.execute(
      `UPDATE ${CRM.applications} SET ${keys.map(k => `\`${k}\`=?`).join(',')},updated_by=? WHERE id=?`,
      [...Object.values(values), by, id],
    );
  }

  /** Updates FAP-only values (is_fap_form_locked, ...) that live on the FAP profile of the application. */
  async updateFap(conn: Conn, applicationId: string, values: Record<string, any>, by: string | null) {
    const keys = Object.keys(values);
    if (!keys.length) return;
    await conn.execute(
      `UPDATE ${CRM.fapApplicationProfiles} SET ${keys.map(k => `\`${k}\`=?`).join(',')},updated_by=? WHERE application_id=?`,
      [...Object.values(values), by, applicationId],
    );
  }

  /** Marks the application as changed (updated_at) without changing data. */
  async touch(conn: Conn, id: string, by: string | null) {
    await conn.execute(`UPDATE ${CRM.applications} SET updated_at=CURRENT_TIMESTAMP(3),updated_by=? WHERE id=?`, [
      by,
      id,
    ]);
  }

  async stageProgress(id: string, conn: Conn = this.db.pool) {
    const [rows] = await conn.execute<any[]>(
      `SELECT * FROM ${CRM.applicationStageProgress} WHERE application_id=?`,
      [id],
    );
    return rows;
  }

  /** Creates or updates the progress row of one stage. */
  async saveStageProgress(
    conn: Conn,
    applicationId: string,
    stageId: string,
    values: {statusId: string; isLocked?: boolean; submitted?: boolean; completed?: boolean},
    actor: Actor,
  ) {
    const [rows] = await conn.execute<any[]>(
      `SELECT id FROM ${CRM.applicationStageProgress} WHERE application_id=? AND stage_id=? FOR UPDATE`,
      [applicationId, stageId],
    );
    if (!rows.length) {
      await conn.execute(
        `INSERT INTO ${CRM.applicationStageProgress}
           (id,application_id,stage_id,status_id,is_locked,submitted_at,completed_at,created_by)
         VALUES (?,?,?,?,?,${values.submitted ? 'CURRENT_TIMESTAMP(3)' : 'NULL'},
                 ${values.completed ? 'CURRENT_TIMESTAMP(3)' : 'NULL'},?)`,
        [crypto.randomUUID(), applicationId, stageId, values.statusId, values.isLocked ? 1 : 0, actor.username || null],
      );
      return;
    }
    await conn.execute(
      `UPDATE ${CRM.applicationStageProgress} SET status_id=?
         ${values.isLocked === undefined ? '' : `,is_locked=${values.isLocked ? 1 : 0}`}
         ${values.submitted ? ',submitted_at=CURRENT_TIMESTAMP(3)' : ''}
         ${values.completed ? ',completed_at=CURRENT_TIMESTAMP(3)' : ''},updated_by=?
       WHERE id=?`,
      [values.statusId, actor.username || null, rows[0].id],
    );
  }

  async addTransition(
    conn: Conn,
    t: {
      applicationId: string;
      workflowId: string | null;
      fromStatusId: string | null;
      toStatusId: string;
      action: string;
      comments: string;
    },
    actor: Actor,
  ) {
    await conn.execute(
      `INSERT INTO ${CRM.applicationStageTransitions}
         (id,application_id,workflow_id,from_status_id,to_status_id,action_code,comments,actor_user_id,actor_name,
          actor_role)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        crypto.randomUUID(),
        t.applicationId,
        t.workflowId,
        t.fromStatusId,
        t.toStatusId,
        t.action,
        t.comments || null,
        actorId(actor),
        actorName(actor),
        String(actor.role || '').slice(0, 30) || 'USER',
      ],
    );
  }

  async transitions(id: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${CRM.applicationStageTransitions} WHERE application_id=? ORDER BY transitioned_at,id`,
      [id],
    );
    return rows;
  }

  async addSignoff(
    conn: Conn,
    s: {applicationId: string; stageId: string; roleCode: string; decision: 'SIGNED' | 'APPROVED' | 'REJECTED'; remarks: string},
    actor: Actor,
  ) {
    await conn.execute(
      `INSERT INTO ${CRM.applicationSignoffs}
         (id,application_id,stage_id,role_code,actor_user_id,actor_name,decision,remarks)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        crypto.randomUUID(),
        s.applicationId,
        s.stageId,
        s.roleCode,
        actorId(actor),
        actorName(actor),
        s.decision,
        s.remarks || null,
      ],
    );
  }

  async signoffs(id: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${CRM.applicationSignoffs} WHERE application_id=? ORDER BY signed_at,id`,
      [id],
    );
    return rows;
  }
}
