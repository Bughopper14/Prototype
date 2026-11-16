import crypto from 'node:crypto';
import {CRM} from '../../core/db/crm-tables';
import {pool} from '../../core/db/pool';

/** Who did it: the signed-in user (actor_user_id refers to the users table's id). */
export type ActivityActor = {
  portalUserId?: number;
  name?: string;
  username?: string;
  role?: string;
  displayRole?: string;
};

export type ActivityEntry = {
  applicationId: string;
  stageCode?: string | null;
  section?: string | null;
  tabIndex?: number | null;
  actionType: string;
  title: string;
  details?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  /** Field changes (array) for the feed, or the deed review record ({deedId, ...}) for DEED_* rows. */
  changes?: unknown;
};

/** Action types of deed review rows; their changes_json holds {deedId, deedNumber, action, status, comments}. */
export const DEED_REVIEW_ACTIONS = ['DEED_SUBMIT', 'DEED_APPROVE', 'DEED_REJECT', 'DEED_REMARKS'];

const cut = (v: unknown, n: number) => (v === undefined || v === null ? null : String(v).slice(0, n));

function parseJson(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

/** Appends an entry to the activity log (the field changes or the deed review record go to changes_json). */
export async function logActivity(entry: ActivityEntry, actor: ActivityActor) {
  const userId = Number(actor.portalUserId);
  await pool.execute(
    `INSERT INTO ${CRM.applicationActivityLogs}
       (id,application_id,stage_code,section_name,tab_index,action_type,title,details,previous_status,new_status,
        changes_json,actor_user_id,actor_name,actor_role)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      crypto.randomUUID(),
      entry.applicationId,
      cut(entry.stageCode, 50),
      cut(entry.section, 100),
      Number.isInteger(entry.tabIndex) ? (entry.tabIndex as number) : null,
      cut(entry.actionType, 50),
      cut(entry.title, 255),
      entry.details ?? null,
      cut(entry.previousStatus, 60),
      cut(entry.newStatus, 60),
      entry.changes === undefined || entry.changes === null ? null : JSON.stringify(entry.changes),
      Number.isInteger(userId) && userId > 0 ? userId : null,
      cut(actor.name || actor.username || 'User', 150),
      cut(actor.displayRole || actor.role || 'USER', 30),
    ],
  );
}

/** Logs the entry without ever failing the action that triggered it: that action is already committed. */
export async function recordActivity(entry: ActivityEntry, actor: ActivityActor) {
  try {
    await logActivity(entry, actor);
  } catch (e) {
    console.error('Activity log failed:', (e as Error).message);
  }
}

/** Newest entries first, for the Activity page (all applications) or one application's Activity tab. */
export async function activityFeed(options: {applicationId?: string; limit?: number} = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 200, 1), 500);
  const [rows] = await pool.query<any[]>(
    `SELECT l.*,a.fap_registration_number AS fap_number,p.company_name
     FROM ${CRM.applicationActivityLogs} l
     JOIN ${CRM.applications} a ON a.id=l.application_id AND a.deleted_at IS NULL
     LEFT JOIN ${CRM.fapApplicationProfiles} p ON p.application_id=a.id
     ${options.applicationId ? 'WHERE l.application_id=?' : ''}
     ORDER BY l.action_timestamp DESC,l.id LIMIT ${limit}`,
    options.applicationId ? [options.applicationId] : [],
  );
  return rows.map(r => {
    const changes = parseJson(r.changes_json);
    return {
      id: r.id,
      applicationId: r.application_id,
      fapNumber: r.fap_number,
      companyName: r.company_name || '',
      stage: r.stage_code,
      section: r.section_name || '',
      tabIndex: r.tab_index,
      actionType: r.action_type,
      title: r.title || '',
      details: r.details || '',
      changes: Array.isArray(changes) ? changes : undefined,
      previousStatus: r.previous_status,
      newStatus: r.new_status,
      actionBy: r.actor_name,
      userRole: r.actor_role,
      timestamp: new Date(r.action_timestamp).toISOString(),
    };
  });
}

/** Review history of each deed of an application, oldest first (deed id → entries). */
export async function deedHistory(applicationId: string) {
  const [rows] = await pool.query<any[]>(
    `SELECT action_type,changes_json,actor_name,action_timestamp FROM ${CRM.applicationActivityLogs}
     WHERE application_id=? AND action_type IN (${DEED_REVIEW_ACTIONS.map(() => '?').join(',')})
     ORDER BY action_timestamp,id`,
    [applicationId, ...DEED_REVIEW_ACTIONS],
  );
  const history = new Map<string, any[]>();
  for (const r of rows) {
    const c: any = parseJson(r.changes_json);
    if (!c?.deedId) continue;
    if (!history.has(c.deedId)) history.set(c.deedId, []);
    history.get(c.deedId)!.push({
      action: c.action,
      status: c.status,
      comments: c.comments || '',
      actor: r.actor_name,
      at: new Date(r.action_timestamp).toISOString(),
    });
  }
  return history;
}
