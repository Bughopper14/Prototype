import {z} from 'zod';
import {ensure, Problem} from '../../domain';
import {many, one, exec, tx} from '../../db/query';
import {hashPassword} from '../../auth/password';
import {clearSessionCache, logAudit, type Actor} from '../../auth/session';
import {del, get, post, put} from '../router';

const APP = 'User Management';

/** Everything under /um requires the portal-wide `manage_system` authority. */
async function requireManageSystem(actor: Actor) {
  const allowed = await one(
    `SELECT 1 AS ok FROM user_app_roles uar
     JOIN role_authorities ra ON ra.role_id = uar.role_id
     JOIN authorities au ON au.id = ra.authority_id
     WHERE uar.user_id = ? AND au.authority_name = 'manage_system' LIMIT 1`, [actor.portalUserId]);
  if (!allowed) throw new Problem(403, 'Anda tidak memiliki akses ke User Management.');
}
const audit = (actor: Actor, action: string) => logAudit(actor.portalUserId, action, APP);

type Handler = Parameters<typeof get>[1];
const guarded = (handler: Handler): Handler => async (req, res) => {
  await requireManageSystem(req.actor);
  return handler(req, res);
};

get('/um/overview', guarded(async () => {
  const [users, applications, roles, authorities, roleAuthorities, audits, sessions] = await Promise.all([
    many(`SELECT u.id, u.username, u.full_name, u.position, u.email, u.is_active, u.session_timeout_minutes, r.role_name
          FROM users u
          LEFT JOIN user_app_roles uar ON u.id = uar.user_id AND uar.app_id = 1
          LEFT JOIN roles r ON uar.role_id = r.id AND r.app_id = 1 ORDER BY u.id`),
    many('SELECT * FROM applications ORDER BY id'),
    many('SELECT r.*, a.app_name FROM roles r LEFT JOIN applications a ON r.app_id = a.id ORDER BY r.app_id, r.id'),
    many('SELECT au.*, a.app_name FROM authorities au LEFT JOIN applications a ON au.app_id = a.id ORDER BY au.app_id, au.id'),
    many('SELECT role_id, authority_id FROM role_authorities'),
    many('SELECT a.*, u.username FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.timestamp DESC LIMIT 500'),
    many('SELECT s.*, u.username FROM session_logs s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.login_time DESC LIMIT 500'),
  ]);
  return {users, applications, roles, authorities, roleAuthorities, audits, sessions};
}));

/* ---------- users ---------- */

const userBody = z.object({
  username: z.string().trim().min(1).max(50),
  full_name: z.string().trim().min(1).max(100),
  position: z.string().trim().max(100).default('Staff'),
  email: z.string().trim().max(255).optional().transform(v => v || null),
  password: z.string().optional(),
});

post('/um/users', guarded(async (req, res) => {
  const b = userBody.parse(req.body);
  ensure(b.password && b.password.length >= 6, 'Password minimal 6 karakter.');
  ensure(!(await one('SELECT 1 AS x FROM users WHERE username = ?', [b.username])), `Username '${b.username}' sudah digunakan oleh pengguna lain.`, 400);
  const result = await exec(
    'INSERT INTO users (username, password_hash, full_name, position, email, is_active) VALUES (?, ?, ?, ?, ?, 1)',
    [b.username, hashPassword(b.password!), b.full_name, b.position, b.email]);
  await audit(req.actor, `Added User: ${b.username}`);
  res.status(201);
  return {success: true, id: result.insertId};
}));

put('/um/users/:id', guarded(async req => {
  const b = userBody.parse(req.body);
  const id = Number(req.params.id);
  ensure(!(await one('SELECT 1 AS x FROM users WHERE username = ? AND id != ?', [b.username, id])), `Username '${b.username}' sudah digunakan oleh pengguna lain.`, 400);
  if (b.password?.trim()) {
    await exec('UPDATE users SET username=?, password_hash=?, full_name=?, position=?, email=? WHERE id=?',
      [b.username, hashPassword(b.password), b.full_name, b.position, b.email, id]);
  } else {
    await exec('UPDATE users SET username=?, full_name=?, position=?, email=? WHERE id=?', [b.username, b.full_name, b.position, b.email, id]);
  }
  await audit(req.actor, `Edited User: ${b.username} (ID: ${id})`);
  return {success: true};
}));

del('/um/users/:id', guarded(async req => {
  const id = Number(req.params.id);
  ensure(id !== req.actor.portalUserId, 'Cannot delete yourself');
  await exec('DELETE FROM users WHERE id = ?', [id]);
  await audit(req.actor, `Deleted User ID: ${id}`);
  return {success: true};
}));

get('/um/users/:id/permissions', guarded(async req => {
  const id = Number(req.params.id);
  const [applications, current, roles] = await Promise.all([
    many('SELECT * FROM applications ORDER BY id'),
    many('SELECT app_id, role_id FROM user_app_roles WHERE user_id = ?', [id]),
    many('SELECT id, role_name, app_id FROM roles ORDER BY app_id, id'),
  ]);
  return {applications, currentPermissions: Object.fromEntries(current.map(r => [r.app_id, r.role_id])), roles};
}));

put('/um/users/:id/permissions', guarded(async req => {
  const id = Number(req.params.id);
  const grants = z.record(z.string(), z.union([z.string(), z.number(), z.null()])).parse(req.body);
  await tx(async conn => {
    await exec('DELETE FROM user_app_roles WHERE user_id = ?', [id], conn);
    for (const [appId, roleId] of Object.entries(grants)) {
      if (roleId) await exec('INSERT INTO user_app_roles (user_id, app_id, role_id) VALUES (?, ?, ?)', [id, Number(appId), Number(roleId)], conn);
    }
  });
  await audit(req.actor, `Updated permissions for User ID: ${id}`);
  return {success: true};
}));

put('/um/users/:id/session-timeout', guarded(async req => {
  const minutes = z.coerce.number().int().min(0).parse(req.body?.timeout_minutes);
  const id = Number(req.params.id);
  const user = await one<{username: string}>('SELECT username FROM users WHERE id = ?', [id]);
  ensure(user, 'User not found', 404);
  await exec('UPDATE users SET session_timeout_minutes = ? WHERE id = ?', [minutes, id]);
  const label = minutes === 0 ? 'Unlimited (tanpa batas)' : `${minutes} menit`;
  await audit(req.actor, `Set session timeout user '${user.username}' (ID: ${id}) ke ${label}`);
  return {success: true, timeout_minutes: minutes, message: `Session timeout user '${user.username}' berhasil diubah ke ${label}.`};
}));

post('/um/users/:id/force-logout', guarded(async req => {
  const id = Number(req.params.id);
  const user = await one<{username: string}>('SELECT username FROM users WHERE id = ?', [id]);
  ensure(user, 'User not found', 404);
  await exec('UPDATE users SET force_logout_at = NOW() WHERE id = ?', [id]);
  await exec('UPDATE session_logs SET is_invalidated = 1, logout_time = NOW() WHERE user_id = ? AND (logout_time IS NULL OR is_invalidated = 0)', [id]);
  clearSessionCache();
  await audit(req.actor, `Force Logged Out User: ${user.username} (ID: ${id})`);
  return {success: true, message: `Berhasil mengeluarkan paksa user ${user.username}.`};
}));

post('/um/sessions/:sessionId/terminate', guarded(async req => {
  await exec('UPDATE session_logs SET is_invalidated = 1, logout_time = NOW() WHERE session_id = ?', [req.params.sessionId]);
  clearSessionCache();
  await audit(req.actor, `Terminated Active Session: ${req.params.sessionId}`);
  return {success: true, message: 'Sesi berhasil dihentikan.'};
}));

/* ---------- applications, roles, authorities ---------- */

post('/um/applications', guarded(async req => {
  const b = z.object({app_name: z.string().trim().min(1), url_path: z.string().trim().min(1), description: z.string().default(''), icon_class: z.string().default('fas fa-layer-group')}).parse(req.body);
  await exec('INSERT INTO applications (app_name, url_path, description, icon_class) VALUES (?, ?, ?, ?)', [b.app_name, b.url_path, b.description, b.icon_class]);
  await audit(req.actor, `Added Application: ${b.app_name}`);
  return {success: true};
}));
del('/um/applications/:id', guarded(async req => {
  await exec('DELETE FROM applications WHERE id = ?', [Number(req.params.id)]);
  await audit(req.actor, `Deleted Application ID: ${req.params.id}`);
  return {success: true};
}));

const roleBody = z.object({
  app_id: z.coerce.number().int().optional(),
  role_name: z.string().trim().min(1),
  description: z.string().default(''),
  authorities: z.array(z.coerce.number().int()).default([]),
});
const setRoleAuthorities = async (roleId: number, authorityIds: number[], conn: Parameters<typeof exec>[2]) => {
  await exec('DELETE FROM role_authorities WHERE role_id = ?', [roleId], conn);
  for (const authorityId of authorityIds) await exec('INSERT INTO role_authorities (role_id, authority_id) VALUES (?, ?)', [roleId, authorityId], conn);
};

post('/um/roles', guarded(async req => {
  const b = roleBody.parse(req.body);
  ensure(b.app_id, 'Pilih aplikasi untuk role ini.');
  await tx(async conn => {
    const result = await exec('INSERT INTO roles (app_id, role_name, description) VALUES (?, ?, ?)', [b.app_id, b.role_name, b.description], conn);
    await setRoleAuthorities(result.insertId, b.authorities, conn);
  });
  await audit(req.actor, `Added Role: ${b.role_name}`);
  return {success: true};
}));
put('/um/roles/:id', guarded(async req => {
  const b = roleBody.parse(req.body);
  const id = Number(req.params.id);
  await tx(async conn => {
    await exec('UPDATE roles SET role_name = ?, description = ? WHERE id = ?', [b.role_name, b.description, id], conn);
    await setRoleAuthorities(id, b.authorities, conn);
  });
  await audit(req.actor, `Edited Role ID: ${id}`);
  return {success: true};
}));
del('/um/roles/:id', guarded(async req => {
  await exec('DELETE FROM roles WHERE id = ?', [Number(req.params.id)]);
  await audit(req.actor, `Deleted Role ID: ${req.params.id}`);
  return {success: true};
}));

post('/um/authorities', guarded(async req => {
  const b = z.object({app_id: z.coerce.number().int(), authority_name: z.string().trim().min(1), description: z.string().default('')}).parse(req.body);
  await exec('INSERT INTO authorities (app_id, authority_name, description) VALUES (?, ?, ?)', [b.app_id, b.authority_name, b.description]);
  await audit(req.actor, `Added Authority: ${b.authority_name}`);
  return {success: true};
}));
del('/um/authorities/:id', guarded(async req => {
  await exec('DELETE FROM authorities WHERE id = ?', [Number(req.params.id)]);
  await audit(req.actor, `Deleted Authority ID: ${req.params.id}`);
  return {success: true};
}));
