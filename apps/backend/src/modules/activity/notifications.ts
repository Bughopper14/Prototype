import crypto from 'node:crypto';
import {CRM} from '../../core/db/crm-tables';
import {pool} from '../../core/db/pool';
import type {ActivityActor} from './activity-log';
import {holdersOf, idsOf} from './users/recipients';

export type NewNotification = {
  applicationId: string;
  deedId?: string | null;
  /** DEED_REVIEW (a deed waits for approval / was reviewed) or WORKFLOW_ACTION (an application waits for an action). */
  type: string;
  title: string;
  message: string;
};

/** In-app notifications, one row per recipient (the notifications table). Recipients come from ./users/recipients. */
export async function newNotification(recipientUserIds: number[], n: NewNotification) {
  for (const userId of new Set(recipientUserIds))
    await pool.execute(
      `INSERT INTO ${CRM.applicationNotifications}
         (id,recipient_user_id,application_id,deed_id,notification_type,title,message) VALUES (?,?,?,?,?,?,?)`,
      [crypto.randomUUID(), userId, n.applicationId, n.deedId ?? null, n.type, n.title.slice(0, 255), n.message],
    );
}

/** Notifies every active user holding one of the authorities, except the actor. Never fails the triggering action. */
export async function notifyHolders(authorities: string[], except: ActivityActor, n: NewNotification) {
  try {
    await newNotification((await holdersOf(authorities)).filter(id => id !== Number(except.portalUserId)), n);
  } catch (e) {
    console.error('Notification failed:', (e as Error).message);
  }
}

/** Notifies the given users (by username), except the actor. Never fails the triggering action. */
export async function notifyUsers(usernames: string[], except: ActivityActor, n: NewNotification) {
  try {
    await newNotification((await idsOf(usernames)).filter(id => id !== Number(except.portalUserId)), n);
  } catch (e) {
    console.error('Notification failed:', (e as Error).message);
  }
}

export async function notificationsOf(userId: number) {
  const [rows] = await pool.query<any[]>(
    `SELECT n.*,p.company_name
     FROM ${CRM.applicationNotifications} n
     LEFT JOIN ${CRM.applications} a ON a.id=n.application_id
     LEFT JOIN ${CRM.fapApplicationProfiles} p ON p.application_id=n.application_id
     WHERE n.recipient_user_id=? AND (a.id IS NULL OR a.deleted_at IS NULL)
     ORDER BY n.created_at DESC LIMIT 200`,
    [userId],
  );
  return rows.map(r => ({
    id: r.id,
    applicationId: r.application_id,
    deedId: r.deed_id,
    type: r.notification_type,
    companyName: r.company_name || '',
    title: r.title,
    message: r.message,
    isRead: !!r.is_read,
    readAt: r.read_at,
    createdAt: r.created_at,
  }));
}

/** Marks one of the user's own notifications as read; false when it is not theirs or does not exist. */
export async function markNotificationRead(id: string, userId: number) {
  const [result] = await pool.execute<any>(
    `UPDATE ${CRM.applicationNotifications} SET is_read=1,read_at=COALESCE(read_at,CURRENT_TIMESTAMP(3))
     WHERE id=? AND recipient_user_id=?`,
    [id, userId],
  );
  return result.affectedRows > 0;
}
