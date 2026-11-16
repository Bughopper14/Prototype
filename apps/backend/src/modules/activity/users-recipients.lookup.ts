import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../core/db/crm-database';

/**
 * Read-only bridge to the users module's tables: which active users hold an authority, and the id of a username.
 * Used to pick notification recipients. This file names only users_ tables, never a crm_ table, and never writes.
 * The users tables live in the same database as the CRM tables.
 */
const q = (table: string) => `\`${table}\``;

@Injectable()
export class UsersRecipientsLookup {
  constructor(private readonly db: CrmDatabase) {}

  /** Active users whose role grants any of the given authority names. */
  async holdersOf(authorityNames: string[]): Promise<number[]> {
    const names = [...new Set(authorityNames.filter(Boolean))];
    if (!names.length) return [];
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT DISTINCT u.id FROM ${q('users_users')} u
       JOIN ${q('users_user_app_roles')} uar ON uar.user_id=u.id
       JOIN ${q('users_role_authorities')} ra ON ra.role_id=uar.role_id
       JOIN ${q('users_authorities')} au ON au.id=ra.authority_id AND au.app_id=uar.app_id
       WHERE u.is_active=1 AND au.authority_name IN (${names.map(() => '?').join(',')})`,
      names,
    );
    return rows.map(r => Number(r.id));
  }

  /** Ids of active users by username (the CRM tables record who acted by username). */
  async idsOf(usernames: string[]): Promise<number[]> {
    const names = [...new Set(usernames.filter(Boolean))];
    if (!names.length) return [];
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT id FROM ${q('users_users')} WHERE is_active=1 AND username IN (${names.map(() => '?').join(',')})`,
      names,
    );
    return rows.map(r => Number(r.id));
  }
}
