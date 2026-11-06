import {many} from '../../db/query';
import {logAudit} from '../../auth/session';
import {get} from '../router';
import {canManageSystem} from './user-management';

/* ---------- portal (gallery + page access), formerly queried by the Next.js server pages ---------- */

type PortalApp = {
  id: number;
  app_name: string;
  url_path: string;
  description: string | null;
  icon_class: string | null;
  role_name: string;
};

/** Applications the signed-in user may open (the Apps Hub gallery). */
get('/portal/apps', async req => {
  const apps = await many<PortalApp>(
    `SELECT a.id, a.app_name, a.url_path, a.description, a.icon_class, r.role_name
     FROM applications a
     JOIN user_app_roles uar ON a.id = uar.app_id
     JOIN roles r ON uar.role_id = r.id
     WHERE uar.user_id = ? ORDER BY a.id`,
    [req.actor.portalUserId],
  );
  await logAudit(req.actor.portalUserId, 'Viewed Dashboard Gallery');
  return apps;
});

/** Page-level access flags for the portal (the API itself still enforces every permission). */
get('/portal/access', async req => ({manageSystem: await canManageSystem(req.actor)}));
