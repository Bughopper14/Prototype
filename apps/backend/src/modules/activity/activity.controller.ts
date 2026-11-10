import {Controller, Get, Patch, Post, Res} from '@nestjs/common';
import {pool} from '../../core/db/pool';
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
    SELECT l.id, l.application_id AS applicationId, l.action_by AS actionBy, l.user_role AS userRole,
           l.previous_status AS previousStatus, l.new_status AS newStatus, l.comments,
           l.action_timestamp AS actionTimestamp, COALESCE(f.company_name, '') AS companyName
    FROM application_activity l
    LEFT JOIN all_applications a ON a.application_id = l.application_id
    LEFT JOIN new_application_fap_stage f ON f.id_fap_stage = a.id_fap_stage
    ORDER BY l.action_timestamp DESC LIMIT 100`);
    return rows;
  }

  @Get('notifications')
  async notifications(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_view_notifications');
    const [rows] = await pool.query<any[]>(
      `SELECT id, application_id AS applicationId, deed_id AS deedId, title, message, read_at AS readAt, created_at AS createdAt
     FROM notifications WHERE recipient_user_id=? ORDER BY created_at DESC LIMIT 200`,
      [req.actor.id],
    );
    return rows;
  }

  @Patch('notifications/:id/read')
  async markNotificationRead(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const [result] = await pool.execute<any>(
      'UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP(3)) WHERE id=? AND recipient_user_id=?',
      [req.params.id, req.actor.id],
    );
    ensure(result.affectedRows, 'Notifikasi tidak ditemukan.', 404);
    return {ok: true};
  }
}
