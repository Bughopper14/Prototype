import {Controller, Get, Patch, Res} from '@nestjs/common';
import {ensure} from '../../core/domain';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {requireAuthority} from '../auth/session';
import {ActivityRepository} from './activity.repository';
import {ActivityService} from './activity.service';

@Controller(API_PREFIX)
export class ActivityController {
  constructor(
    private readonly activity: ActivityRepository,
    private readonly service: ActivityService,
  ) {}

  /** Activity page: newest entries of every application. */
  @Get('activity')
  activityFeed(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_view_activity');
    return this.activity.feed({limit: 200});
  }

  @Get('notifications')
  notifications(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_view_notifications');
    return this.service.notifications.forUser(req.actor.portalUserId);
  }

  @Patch('notifications/:id/read')
  async markNotificationRead(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_view_notifications');
    ensure(await this.service.notifications.markRead(req.params.id, req.actor.portalUserId), 'Notifikasi tidak ditemukan.', 404);
    return {ok: true};
  }
}
