import {Controller, Get, Patch, Post, Res} from '@nestjs/common';
import {pool} from '../../core/db/pool';
import {parsePortalUserId} from '../../core/db/crm-lookups';
import {ensure} from '../../core/domain';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {requireAuthority} from '../auth/session';

@Controller(API_PREFIX)
export class ActivityController {
  @Post('user-activity')
  recordUserActivity(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    return {ok: true, action: req.body?.action};
  }

  @Get('activity')
  async activityFeed(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_view_activity', 'crm_view_app_activity');
    const [rows] = await pool.query<any[]>(`
      SELECT l.id,
             l.application_id AS applicationId,
             COALESCE(a.fap_registration_number, '') AS fapNumber,
             COALESCE(p.company_name, c.company_name, '') AS companyName,
             COALESCE(l.section_name, l.stage_code, 'Workspace') AS section,
             COALESCE(l.tab_index, 0) AS tabIndex,
             l.action_type AS actionType,
             COALESCE(l.title, l.details, 'Application updated') AS title,
             COALESCE(l.details, l.title, '') AS details,
             COALESCE(l.details, l.title, '') AS comments,
             l.actor_name AS actionBy,
             l.actor_role AS userRole,
             l.previous_status AS previousStatus,
             l.new_status AS newStatus,
             l.action_timestamp AS actionTimestamp,
             l.action_timestamp AS timestamp
      FROM crm_application_activity_logs l
      LEFT JOIN crm_applications a ON a.id = l.application_id
      LEFT JOIN crm_fap_application_profiles p ON p.application_id = a.id
      LEFT JOIN crm_master_business_partners c ON c.id = a.customer_id
      ORDER BY l.action_timestamp DESC LIMIT 100`);

    const logIds = rows.map(r => r.id).filter(Boolean);
    const changesByLog = new Map<string, any[]>();
    if (logIds.length > 0) {
      const placeholders = logIds.map(() => '?').join(',');
      const [changeRows] = await pool.query<any[]>(
        `SELECT activity_log_id, section_name, sub_section, field_key, field_label, old_value, new_value
         FROM crm_application_activity_changes
         WHERE activity_log_id IN (${placeholders})
         ORDER BY sort_order ASC, created_at ASC`,
        logIds,
      );
      for (const c of changeRows) {
        const arr = changesByLog.get(c.activity_log_id) || [];
        arr.push({
          section: c.section_name || undefined,
          subSection: c.sub_section || undefined,
          fieldKey: c.field_key || undefined,
          fieldLabel: c.field_label || undefined,
          oldValue: c.old_value ?? '',
          newValue: c.new_value ?? '',
        });
        changesByLog.set(c.activity_log_id, arr);
      }
    }

    return rows.map(r => {
      const changes = changesByLog.get(r.id);
      const {changesJson: _unused, ...rest} = r;
      return {...rest, changes};
    });
  }

  @Get('notifications')
  async notifications(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_view_notifications');
    const userId = req.actor.portalUserId || parsePortalUserId(req.actor.id);
    if (!userId) return [];
    const [rows] = await pool.query<any[]>(
      `SELECT n.id,
              n.application_id AS applicationId,
              n.deed_id AS deedId,
              n.notification_type AS taskType,
              COALESCE(a.fap_registration_number, '') AS fapNumber,
              COALESCE(p.company_name, c.company_name, 'Application') AS companyName,
              n.title,
              n.message,
              n.action_url AS actionUrl,
              n.read_at AS readAt,
              n.is_read AS isRead,
              n.created_at AS createdAt
       FROM crm_application_notifications n
       LEFT JOIN crm_applications a ON a.id = n.application_id
       LEFT JOIN crm_fap_application_profiles p ON p.application_id = a.id
       LEFT JOIN crm_master_business_partners c ON c.id = a.customer_id
       WHERE n.recipient_user_id = ?
       ORDER BY n.created_at DESC LIMIT 200`,
      [userId],
    );
    return rows;
  }

  @Patch('notifications/:id/read')
  async markNotificationRead(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const userId = req.actor.portalUserId || parsePortalUserId(req.actor.id);
    ensure(userId, 'Invalid recipient user', 403);
    const [result] = await pool.execute<any>(
      `UPDATE crm_application_notifications
       SET is_read = 1, read_at = COALESCE(read_at, CURRENT_TIMESTAMP(3))
       WHERE id = ? AND recipient_user_id = ?`,
      [req.params.id, userId],
    );
    ensure(result.affectedRows, 'Notifikasi tidak ditemukan.', 404);
    return {ok: true};
  }
}
