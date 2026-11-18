import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../core/db/crm-database';
import {USER_TABLES} from '../../core/db/user-tables';

/**
 * Read-only bridge to the users tables, which belong to the users module: the names of users (to show who decided) and which
 * authority names exist (so the workflow editor can tell an administrator that an authority still has to be created).
 *
 * This file names only users tables (through USER_TABLES), never a CRM table, and never writes. The users tables live in the same
 * database as the CRM tables.
 */
@Injectable()
export class UsersNamesLookup {
  constructor(private readonly db: CrmDatabase) {}

  /** user id → full name (or username). */
  async names(ids: number[]): Promise<Map<number, string>> {
    const unique = [...new Set(ids.filter(id => Number.isInteger(id)))];
    if (!unique.length) return new Map();
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT id, username, full_name FROM ${USER_TABLES.users} WHERE id IN (${unique.map(() => '?').join(',')})`,
      unique,
    );
    return new Map(rows.map(r => [Number(r.id), String(r.full_name || r.username)]));
  }

  /** The approval authorities of the CRM application (names ending with _APPROVE or _REJECT), for the picker of an approval step. */
  async crmAuthorities(): Promise<{name: string; description: string}[]> {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT a.authority_name, a.description FROM ${USER_TABLES.authorities} a
       JOIN ${USER_TABLES.applications} ap ON ap.id = a.app_id
       WHERE ap.app_name LIKE 'CRM%' AND (LOWER(a.authority_name) LIKE '%\\_approve' OR LOWER(a.authority_name) LIKE '%\\_reject') ORDER BY a.authority_name`,
    );
    return rows.map(r => ({name: String(r.authority_name), description: String(r.description ?? '')}));
  }

  /** Which of these authority names exist in users_authorities (case as stored). */
  async existing(authorityNames: string[]): Promise<Set<string>> {
    const unique = [...new Set(authorityNames.filter(Boolean))];
    if (!unique.length) return new Set();
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT authority_name FROM ${USER_TABLES.authorities} WHERE authority_name IN (${unique.map(() => '?').join(',')})`,
      unique,
    );
    return new Set(rows.map(r => String(r.authority_name)));
  }

  /** The user with this email (Lark people are matched to users by email), or null. */
  async byEmail(email: string): Promise<{id: number; username: string; fullName: string} | null> {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT id, username, full_name FROM ${USER_TABLES.users} WHERE is_active = 1 AND LOWER(email) = LOWER(?) LIMIT 1`,
      [email.trim()],
    );
    return rows[0] ? {id: Number(rows[0].id), username: rows[0].username, fullName: rows[0].full_name || rows[0].username} : null;
  }
}
