import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../core/db/crm-database';
import {USER_TABLES} from '../../core/db/user-tables';

/**
 * Read-only bridge to the users tables, which belong to the users module: the name of the PIC Marketing of an application (crm_applications.mkt_pic_id
 * holds a user id). This file names only users tables (through USER_TABLES), never a CRM table, and never writes.
 */
@Injectable()
export class MktPicLookup {
  constructor(private readonly db: CrmDatabase) {}

  /** Every active user, for the PIC Marketing dropdown (no role filter for now). */
  async candidates(): Promise<{id: number; name: string; username: string}[]> {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT id, username, full_name FROM ${USER_TABLES.users} WHERE is_active = 1 ORDER BY COALESCE(NULLIF(full_name, ''), username)`,
    );
    return rows.map(r => ({id: Number(r.id), name: String(r.full_name || r.username || ''), username: String(r.username || '')}));
  }

  /** The name (full name, else username) of each user id; ids that do not exist are left out. */
  async names(ids: Iterable<number | null | undefined>): Promise<Map<number, {name: string; username: string; deptId?: number; deptCode?: string; deptName?: string}>> {
    const wanted = [...new Set([...ids].map(Number).filter(n => Number.isInteger(n) && n > 0))];
    if (!wanted.length) return new Map();
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT u.id, u.username, u.full_name, u.dept_id, d.department_code, d.department_name
       FROM ${USER_TABLES.users} u
       LEFT JOIN ${USER_TABLES.departments} d ON d.dept_id = u.dept_id
       WHERE u.id IN (${wanted.map(() => '?').join(',')})`,
      wanted,
    );
    return new Map(
      rows.map(r => [
        Number(r.id),
        {
          name: String(r.full_name || r.username || ''),
          username: String(r.username || ''),
          deptId: r.dept_id ? Number(r.dept_id) : undefined,
          deptCode: r.department_code || undefined,
          deptName: r.department_name || undefined,
        },
      ]),
    );
  }
}
