import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';

export type NewNotification = {
  applicationId: string;
  deedId?: string | null;
  /** DEED_REVIEW (a deed waits for approval / was reviewed) or WORKFLOW_ACTION (an application waits for an action). */
  type: string;
  title: string;
  message: string;
};

/** In-app notifications, one row per recipient (crm_application_notifications). */
@Injectable()
export class NotificationsRepository {
  constructor(private readonly db: CrmDatabase) {}

  async create(recipientUserIds: number[], n: NewNotification) {
    for (const userId of new Set(recipientUserIds))
      await this.db.pool.execute(
        `INSERT INTO ${CRM.applicationNotifications}
           (id,recipient_user_id,application_id,deed_id,notification_type,title,message) VALUES (?,?,?,?,?,?,?)`,
        [crypto.randomUUID(), userId, n.applicationId, n.deedId ?? null, n.type, n.title.slice(0, 255), n.message],
      );
  }

  async forUser(userId: number) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT n.*,a.fap_registration_number AS fap_number,p.company_name
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
      fapNumber: r.fap_number,
      companyName: r.company_name || '',
      title: r.title,
      message: r.message,
      isRead: !!r.is_read,
      readAt: r.read_at,
      createdAt: r.created_at,
    }));
  }

  /** Marks one of the user's own notifications as read; false when it is not theirs or does not exist. */
  async markRead(id: string, userId: number) {
    const [result] = await this.db.pool.execute<any>(
      `UPDATE ${CRM.applicationNotifications} SET is_read=1,read_at=COALESCE(read_at,CURRENT_TIMESTAMP(3))
       WHERE id=? AND recipient_user_id=?`,
      [id, userId],
    );
    return result.affectedRows > 0;
  }
}
