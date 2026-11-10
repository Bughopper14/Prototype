import crypto from 'node:crypto';
import {pool} from '../../core/db/pool';
import {DEED_APPROVE_AUTHORITY} from '@liugong/shared';

export const newNotification = (
  recipient: string,
  applicationId: string,
  deedId: string,
  title: string,
  message: string,
) =>
  pool.execute(
    'INSERT INTO notifications(id,recipient_user_id,application_id,deed_id,title,message) VALUES(?,?,?,?,?,?)',
    [crypto.randomUUID(), recipient, applicationId, deedId, title, message],
  );

/** Notifies every user holding the "Legal Approval" role (except `exceptUserId`) that a deed waits for them. */
export async function notifyLegalApprovers(
  exceptUserId: string,
  applicationId: string,
  deedId: string,
  title: string,
  message: string,
) {
  const [rows] = await pool.query<any[]>(
    `SELECT DISTINCT uar.user_id FROM user_app_roles uar
     JOIN role_authorities ra ON ra.role_id = uar.role_id
     JOIN authorities au ON au.id = ra.authority_id
     WHERE uar.app_id = 2 AND au.authority_name = ? AND CONCAT('portal-', uar.user_id) <> ?`,
    [DEED_APPROVE_AUTHORITY, String(exceptUserId)],
  );
  for (const row of rows)
    await newNotification(`portal-${row.user_id}`, applicationId, deedId, title, message);
}
