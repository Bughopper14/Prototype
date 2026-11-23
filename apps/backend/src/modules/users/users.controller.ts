import {Controller, Delete, Get, Post, Put, Res, UseGuards, UseInterceptors} from '@nestjs/common';
import {ClearSessionCacheInterceptor, ManageSystemGuard} from './manage-system';
import {z} from 'zod';
import {exec, many, one, tx} from '../../core/db/query';
import {USER_TABLES} from '../../core/db/user-tables';
import {ensure} from '../../core/domain';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {hashPassword} from '../auth/password';
import {logAudit, type Actor} from '../auth/session';

const APP = 'User Management';

const audit = (actor: Actor, action: string) => logAudit(actor.portalUserId, action, APP);

/* ---------- users ---------- */

const userBody = z.object({
  username: z.string().trim().min(1).max(50),
  full_name: z.string().trim().min(1).max(100),
  position: z.string().trim().max(100).default('Staff'),
  dept_id: z.coerce.number().int().nullable().optional(),
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform(v => v || null),
  password: z.string().optional(),
});

const deptBody = z.object({
  department_code: z.string().trim().min(1).max(50),
  department_name: z.string().trim().min(1).max(150),
  description: z.string().trim().default(''),
});

const roleBody = z.object({
  app_id: z.coerce.number().int().optional(),
  role_name: z.string().trim().min(1),
  description: z.string().default(''),
  authorities: z.array(z.coerce.number().int()).default([]),
});

const setRoleAuthorities = async (
  roleId: number,
  authorityIds: number[],
  conn: Parameters<typeof exec>[2],
) => {
  await exec(`DELETE FROM ${USER_TABLES.role_authorities} WHERE role_id = ?`, [roleId], conn);
  for (const authorityId of authorityIds)
    await exec(
      `INSERT INTO ${USER_TABLES.role_authorities} (role_id, authority_id) VALUES (?, ?)`,
      [roleId, authorityId],
      conn,
    );
};

/** User management (portal-wide): users, roles, authorities, applications, sessions. */
@Controller(`${API_PREFIX}/um`)
@UseGuards(ManageSystemGuard)
@UseInterceptors(ClearSessionCacheInterceptor)
export class UsersController {
  @Get('overview')
  async overview(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const [users, departments, applications, roles, authorities, roleAuthorities, audits, sessions] = await Promise.all([
      many(`SELECT u.id, u.username, u.full_name, u.position, u.email, u.is_active, u.session_timeout_minutes, u.dept_id, d.department_code, d.department_name, r.role_name
          FROM ${USER_TABLES.users} u
          LEFT JOIN ${USER_TABLES.departments} d ON u.dept_id = d.dept_id
          LEFT JOIN ${USER_TABLES.user_app_roles} uar ON u.id = uar.user_id AND uar.app_id = 1
          LEFT JOIN ${USER_TABLES.roles} r ON uar.role_id = r.id AND r.app_id = 1 ORDER BY u.id`),
      many(`SELECT d.*, 
          (SELECT COUNT(*) FROM ${USER_TABLES.users} u WHERE u.dept_id = d.dept_id AND u.is_active = 1) AS user_count,
          (SELECT GROUP_CONCAT(u.full_name SEPARATOR ', ') FROM ${USER_TABLES.users} u WHERE u.dept_id = d.dept_id AND u.is_active = 1) AS user_names
          FROM ${USER_TABLES.departments} d
          WHERE d.is_active = 1
          ORDER BY d.dept_id`),
      many(`SELECT * FROM ${USER_TABLES.applications} ORDER BY id`),
      many(
        `SELECT r.*, a.app_name FROM ${USER_TABLES.roles} r LEFT JOIN ${USER_TABLES.applications} a ON r.app_id = a.id ORDER BY r.app_id, r.id`,
      ),
      many(
        `SELECT au.*, a.app_name FROM ${USER_TABLES.authorities} au LEFT JOIN ${USER_TABLES.applications} a ON au.app_id = a.id ORDER BY au.app_id, au.id`,
      ),
      many(`SELECT role_id, authority_id FROM ${USER_TABLES.role_authorities}`),
      many(
        `SELECT a.*, u.username FROM ${USER_TABLES.audit_logs} a LEFT JOIN ${USER_TABLES.users} u ON a.user_id = u.id ORDER BY a.timestamp DESC LIMIT 500`,
      ),
      many(
        `SELECT s.*, u.username FROM ${USER_TABLES.session_logs} s LEFT JOIN ${USER_TABLES.users} u ON s.user_id = u.id ORDER BY s.login_time DESC LIMIT 500`,
      ),
    ]);
    return {users, departments, applications, roles, authorities, roleAuthorities, audits, sessions};
  }

  @Post('users')
  async createUser(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const b = userBody.parse(req.body);
    ensure(b.password && b.password.length >= 6, 'Password minimal 6 karakter.');
    ensure(
      !(await one(`SELECT 1 AS x FROM ${USER_TABLES.users} WHERE username = ?`, [b.username])),
      `Username '${b.username}' sudah digunakan oleh pengguna lain.`,
      400,
    );
    const result = await exec(
      `INSERT INTO ${USER_TABLES.users} (username, password_hash, full_name, position, dept_id, email, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [b.username, hashPassword(b.password!), b.full_name, b.position, b.dept_id ?? null, b.email],
    );
    await audit(req.actor, `Added User: ${b.username}`);
    res.status(201);
    return {success: true, id: result.insertId};
  }

  @Put('users/:id')
  async updateUser(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const b = userBody.parse(req.body);
    const id = Number(req.params.id);
    ensure(
      !(await one(`SELECT 1 AS x FROM ${USER_TABLES.users} WHERE username = ? AND id != ?`, [b.username, id])),
      `Username '${b.username}' sudah digunakan oleh pengguna lain.`,
      400,
    );
    if (b.password?.trim()) {
      await exec(
        `UPDATE ${USER_TABLES.users} SET username=?, password_hash=?, full_name=?, position=?, dept_id=?, email=?, updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,
        [b.username, hashPassword(b.password), b.full_name, b.position, b.dept_id ?? null, b.email, id],
      );
    } else {
      await exec(
        `UPDATE ${USER_TABLES.users} SET username=?, full_name=?, position=?, dept_id=?, email=?, updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,
        [
        b.username,
        b.full_name,
        b.position,
        b.dept_id ?? null,
        b.email,
        id,
      ]);
    }
    await audit(req.actor, `Edited User: ${b.username} (ID: ${id})`);
    return {success: true};
  }

  @Delete('users/:id')
  async deleteUser(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = Number(req.params.id);
    ensure(id !== req.actor.portalUserId, 'Cannot delete yourself');
    await exec(`DELETE FROM ${USER_TABLES.users} WHERE id = ?`, [id]);
    await audit(req.actor, `Deleted User ID: ${id}`);
    return {success: true};
  }

  /* ---------- departments ---------- */

  @Post('departments')
  async createDepartment(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const b = deptBody.parse(req.body);
    ensure(
      !(await one(`SELECT 1 AS x FROM ${USER_TABLES.departments} WHERE department_code = ? AND is_active = 1`, [b.department_code])),
      `Kode departemen '${b.department_code}' sudah terdaftar.`,
      400,
    );
    const actorName = req.actor?.username || 'System Admin';
    const result = await exec(
      `INSERT INTO ${USER_TABLES.departments} (department_code, department_name, description, is_active, created_by) VALUES (?, ?, ?, 1, ?)`,
      [b.department_code.toUpperCase(), b.department_name, b.description, actorName],
    );
    await audit(req.actor, `Added Department: ${b.department_name} (${b.department_code})`);
    res.status(201);
    return {success: true, id: result.insertId};
  }

  @Put('departments/assign-user')
  async assignUserDepartment(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const {userId, userIds, dept_id} = z.object({
      userId: z.coerce.number().int().optional(),
      userIds: z.array(z.coerce.number().int()).optional(),
      dept_id: z.coerce.number().int().nullable().optional(),
    }).parse(req.body);

    const targetUserIds: number[] = [];
    if (userIds && userIds.length > 0) {
      targetUserIds.push(...userIds);
    } else if (userId !== undefined) {
      targetUserIds.push(userId);
    }

    ensure(targetUserIds.length > 0, 'Pilih minimal satu pengguna.');

    await tx(async conn => {
      for (const uid of targetUserIds) {
        await exec(
          `UPDATE ${USER_TABLES.users} SET dept_id = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
          [dept_id ?? null, uid],
          conn,
        );
      }
    });

    await audit(
      req.actor,
      `Assigned ${targetUserIds.length} User(s) [${targetUserIds.join(', ')}] to Department ID ${dept_id ?? 'None'}`,
    );
    return {success: true, count: targetUserIds.length};
  }

  @Put('departments/:id')
  async updateDepartment(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = Number(req.params.id);
    const b = deptBody.parse(req.body);
    ensure(
      !(await one(`SELECT 1 AS x FROM ${USER_TABLES.departments} WHERE department_code = ? AND dept_id != ? AND is_active = 1`, [b.department_code, id])),
      `Kode departemen '${b.department_code}' sudah terdaftar.`,
      400,
    );
    const actorName = req.actor?.username || 'System Admin';
    await exec(
      `UPDATE ${USER_TABLES.departments} SET department_code=?, department_name=?, description=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE dept_id=?`,
      [b.department_code.toUpperCase(), b.department_name, b.description, actorName, id],
    );
    await audit(req.actor, `Edited Department: ${b.department_name} (ID: ${id})`);
    return {success: true};
  }

  @Delete('departments/:id')
  async deleteDepartment(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = Number(req.params.id);
    const actorName = req.actor?.username || 'System Admin';
    await tx(async conn => {
      // Unlink users from this department (SET NULL)
      await exec(`UPDATE ${USER_TABLES.users} SET dept_id = NULL WHERE dept_id = ?`, [id], conn);
      // Soft delete
      await exec(
        `UPDATE ${USER_TABLES.departments} SET is_active = 0, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE dept_id = ?`,
        [actorName, id],
        conn,
      );
    });
    await audit(req.actor, `Deleted Department ID: ${id}`);
    return {success: true};
  }

  @Get('users/:id/permissions')
  async permissions(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = Number(req.params.id);
    const [applications, current, roles] = await Promise.all([
      many(`SELECT * FROM ${USER_TABLES.applications} ORDER BY id`),
      many(`SELECT app_id, role_id FROM ${USER_TABLES.user_app_roles} WHERE user_id = ?`, [id]),
      many(`SELECT id, role_name, app_id FROM ${USER_TABLES.roles} ORDER BY app_id, id`),
    ]);
    return {
      applications,
      currentPermissions: Object.fromEntries(current.map(r => [r.app_id, r.role_id])),
      roles,
    };
  }

  @Put('users/:id/permissions')
  async updatePermissions(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = Number(req.params.id);
    const grants = z.record(z.string(), z.union([z.string(), z.number(), z.null()])).parse(req.body);
    await tx(async conn => {
      await exec(`DELETE FROM ${USER_TABLES.user_app_roles} WHERE user_id = ?`, [id], conn);
      for (const [appId, roleId] of Object.entries(grants)) {
        if (roleId)
          await exec(
            `INSERT INTO ${USER_TABLES.user_app_roles} (user_id, app_id, role_id) VALUES (?, ?, ?)`,
            [id, Number(appId), Number(roleId)],
            conn,
          );
      }
    });
    await audit(req.actor, `Updated permissions for User ID: ${id}`);
    return {success: true};
  }

  @Put('users/:id/session-timeout')
  async updateSessionTimeout(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const minutes = z.coerce.number().int().min(0).parse(req.body?.timeout_minutes);
    const id = Number(req.params.id);
    const user = await one<{username: string}>(`SELECT username FROM ${USER_TABLES.users} WHERE id = ?`, [id]);
    ensure(user, 'User not found', 404);
    await exec(`UPDATE ${USER_TABLES.users} SET session_timeout_minutes = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`, [
      minutes,
      id,
    ]);
    const label = minutes === 0 ? 'Unlimited (tanpa batas)' : `${minutes} menit`;
    await audit(req.actor, `Set session timeout user '${user.username}' (ID: ${id}) ke ${label}`);
    return {
      success: true,
      timeout_minutes: minutes,
      message: `Session timeout user '${user.username}' berhasil diubah ke ${label}.`,
    };
  }

  @Post('users/:id/force-logout')
  async forceLogout(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = Number(req.params.id);
    const user = await one<{username: string}>(`SELECT username FROM ${USER_TABLES.users} WHERE id = ?`, [id]);
    ensure(user, 'User not found', 404);
    await exec(`UPDATE ${USER_TABLES.users} SET force_logout_at = NOW(), updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`, [id]);
    await exec(
      `UPDATE ${USER_TABLES.session_logs} SET is_invalidated = 1, logout_time = NOW() WHERE user_id = ? AND (logout_time IS NULL OR is_invalidated = 0)`,
      [id],
    );
    await audit(req.actor, `Force Logged Out User: ${user.username} (ID: ${id})`);
    return {success: true, message: `Berhasil mengeluarkan paksa user ${user.username}.`};
  }

  @Post('sessions/:sessionId/terminate')
  async terminateSession(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    await exec(`UPDATE ${USER_TABLES.session_logs} SET is_invalidated = 1, logout_time = NOW() WHERE session_id = ?`, [
      req.params.sessionId,
    ]);
    await audit(req.actor, `Terminated Active Session: ${req.params.sessionId}`);
    return {success: true, message: 'Sesi berhasil dihentikan.'};
  }

  @Post('applications')
  async createApplication(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const b = z
      .object({
        app_name: z.string().trim().min(1),
        url_path: z.string().trim().min(1),
        description: z.string().default(''),
        icon_class: z.string().default('fas fa-layer-group'),
      })
      .parse(req.body);
    await exec(`INSERT INTO ${USER_TABLES.applications} (app_name, url_path, description, icon_class) VALUES (?, ?, ?, ?)`, [
      b.app_name,
      b.url_path,
      b.description,
      b.icon_class,
    ]);
    await audit(req.actor, `Added Application: ${b.app_name}`);
    return {success: true};
  }

  @Delete('applications/:id')
  async deleteApplication(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    await exec(`DELETE FROM ${USER_TABLES.applications} WHERE id = ?`, [Number(req.params.id)]);
    await audit(req.actor, `Deleted Application ID: ${req.params.id}`);
    return {success: true};
  }

  @Post('roles')
  async createRole(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const b = roleBody.parse(req.body);
    ensure(b.app_id, 'Pilih aplikasi untuk role ini.');
    await tx(async conn => {
      const result = await exec(
        `INSERT INTO ${USER_TABLES.roles} (app_id, role_name, description) VALUES (?, ?, ?)`,
        [b.app_id, b.role_name, b.description],
        conn,
      );
      await setRoleAuthorities(result.insertId, b.authorities, conn);
    });
    await audit(req.actor, `Added Role: ${b.role_name}`);
    return {success: true};
  }

  @Put('roles/:id')
  async updateRole(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const b = roleBody.parse(req.body);
    const id = Number(req.params.id);
    await tx(async conn => {
      await exec(
        `UPDATE ${USER_TABLES.roles} SET role_name = ?, description = ? WHERE id = ?`,
        [b.role_name, b.description, id],
        conn,
      );
      await setRoleAuthorities(id, b.authorities, conn);
    });
    await audit(req.actor, `Edited Role ID: ${id}`);
    return {success: true};
  }

  @Delete('roles/:id')
  async deleteRole(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    await exec(`DELETE FROM ${USER_TABLES.roles} WHERE id = ?`, [Number(req.params.id)]);
    await audit(req.actor, `Deleted Role ID: ${req.params.id}`);
    return {success: true};
  }

  @Post('authorities')
  async createAuthority(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const b = z
      .object({
        app_id: z.coerce.number().int(),
        authority_name: z.string().trim().min(1).max(100),
        description: z.string().default(''),
      })
      .parse(req.body);
    // An authority is free text: any name may be created. What it does is decided by whatever checks that name (the code of an application,
    // or the approval steps of a workflow, which keep the name as data).
    ensure(
      !(await one(`SELECT 1 AS x FROM ${USER_TABLES.authorities} WHERE app_id = ? AND authority_name = ?`, [
        b.app_id,
        b.authority_name,
      ])),
      `Authority '${b.authority_name}' sudah ada.`,
      409,
    );
    await exec(`INSERT INTO ${USER_TABLES.authorities} (app_id, authority_name, description) VALUES (?, ?, ?)`, [
      b.app_id,
      b.authority_name,
      b.description,
    ]);
    await audit(req.actor, `Added Authority: ${b.authority_name}`);
    return {success: true};
  }

  @Put('authorities/:id')
  async updateAuthority(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = Number(req.params.id);
    const {description} = z.object({description: z.string().trim().max(255)}).parse(req.body);
    const existing = await one<{authority_name: string}>(
      `SELECT authority_name FROM ${USER_TABLES.authorities} WHERE id = ?`,
      [id],
    );
    ensure(existing, 'Authority tidak ditemukan.', 404);
    await exec(`UPDATE ${USER_TABLES.authorities} SET description = ? WHERE id = ?`, [description, id]);
    await audit(req.actor, `Edited Authority: ${existing.authority_name}`);
    return {success: true};
  }

  @Delete('authorities/:id')
  async deleteAuthority(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = Number(req.params.id);
    const used = await many<{role_name: string}>(
      `SELECT r.role_name FROM ${USER_TABLES.role_authorities} ra JOIN ${USER_TABLES.roles} r ON r.id = ra.role_id WHERE ra.authority_id = ?`,
      [id],
    );
    ensure(
      !used.length,
      `Authority masih dipakai role: ${used.map(r => r.role_name).join(', ')}. Lepas dari role tersebut dulu.`,
      409,
    );
    await exec(`DELETE FROM ${USER_TABLES.authorities} WHERE id = ?`, [id]);
    await audit(req.actor, `Deleted Authority ID: ${id}`);
    return {success: true};
  }
}
