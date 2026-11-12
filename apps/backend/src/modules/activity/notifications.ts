import crypto from 'node:crypto';
import {DEED_APPROVE_AUTHORITY} from '@liugong/shared';
import {pool} from '../../core/db/pool';
import {parsePortalUserId} from '../../core/db/crm-lookups';

export async function newNotification(
  recipient: string | number,
  applicationId: string,
  deedId: string,
  title: string,
  message: string,
  notificationType = 'DEED_REVIEW',
) {
  const recipientUserId = parsePortalUserId(recipient);
  if (!recipientUserId) return;
  return pool.execute(
    `INSERT INTO crm_application_notifications
      (id, recipient_user_id, application_id, deed_id, notification_type, title, message, is_read)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [crypto.randomUUID(), recipientUserId, applicationId, deedId, notificationType, title, message],
  );
}

/** Notifies every user holding the "Legal Approval" role (except `exceptUserId`) that a deed waits for them. */
export async function notifyLegalApprovers(
  exceptUserId: string | number,
  applicationId: string,
  deedId: string,
  title: string,
  message: string,
) {
  const exceptNum = parsePortalUserId(exceptUserId) ?? -1;
  const [rows] = await pool.query<any[]>(
    `SELECT DISTINCT uar.user_id
     FROM users_user_app_roles uar
     JOIN users_role_authorities ra ON ra.role_id = uar.role_id
     JOIN users_authorities au ON au.id = ra.authority_id
     WHERE uar.app_id = 2 AND au.authority_name = ? AND uar.user_id <> ?`,
    [DEED_APPROVE_AUTHORITY, exceptNum],
  );
  for (const row of rows) {
    await newNotification(Number(row.user_id), applicationId, deedId, title, message);
  }
}
