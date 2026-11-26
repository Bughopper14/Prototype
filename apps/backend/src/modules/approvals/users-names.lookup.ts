import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
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

  /** user id → full name (or username). Inside a transaction pass its `conn`: asking the pool for a second connection there can hang every request. */
  async names(ids: number[], conn: Pick<PoolConnection, 'query'> = this.db.pool): Promise<Map<number, string>> {
    const unique = [...new Set(ids.filter(id => Number.isInteger(id)))];
    if (!unique.length) return new Map();
    const [rows] = await conn.query<any[]>(
      `SELECT id, username, full_name FROM ${USER_TABLES.users} WHERE id IN (${unique.map(() => '?').join(',')})`,
      unique,
    );
    return new Map(rows.map(r => [Number(r.id), String(r.full_name || r.username)]));
  }

  /**
   * The authorities a master approval level can use: the CRM authorities (the name starts with CRM_, because User Management holds the authorities of many applications) whose name ends with APPROVE, APPROVAL or APPROVER, with the application
   * they belong to (a level keeps both). Free text is made in User Management; the Master approval tab only picks from these.
   */
  async approvalAuthorities(): Promise<{appId: number; name: string; description: string}[]> {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT a.app_id, a.authority_name, a.description FROM ${USER_TABLES.authorities} a
       JOIN ${USER_TABLES.applications} ap ON ap.id = a.app_id
       WHERE ap.app_name LIKE 'CRM%' AND a.authority_name LIKE 'CRM\\_%' AND a.authority_name REGEXP '(APPROVE|APPROVAL|APPROVER)$' ORDER BY a.authority_name`,
    );
    return rows.map(r => ({appId: Number(r.app_id), name: String(r.authority_name), description: String(r.description ?? '')}));
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
}
