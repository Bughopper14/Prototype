import {Controller, Get, Res} from '@nestjs/common';
import {many} from '../../core/db/query';
import {USER_TABLES} from '../../core/db/user-tables';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {logAudit} from '../auth/session';
import {canManageSystem} from '../users/manage-system';

/* ---------- portal (gallery + page access), formerly queried by the Next.js server pages ---------- */

type PortalApp = {
  id: number;
  app_name: string;
  url_path: string;
  description: string | null;
  icon_class: string | null;
  role_name: string;
};

@Controller(API_PREFIX)
export class PortalController {
  @Get('portal/apps')
  async apps(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const apps = await many<PortalApp>(
      `SELECT a.id, a.app_name, a.url_path, a.description, a.icon_class, r.role_name
     FROM ${USER_TABLES.applications} a
     JOIN ${USER_TABLES.user_app_roles} uar ON a.id = uar.app_id
     JOIN ${USER_TABLES.roles} r ON uar.role_id = r.id
     WHERE uar.user_id = ? ORDER BY a.id`,
      [req.actor.portalUserId],
    );
    await logAudit(req.actor.portalUserId, 'Viewed Dashboard Gallery');
    return apps;
  }

  @Get('portal/access')
  async access(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    return {manageSystem: await canManageSystem(req.actor)};
  }
}
