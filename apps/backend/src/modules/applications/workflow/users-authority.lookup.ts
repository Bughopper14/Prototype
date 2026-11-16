import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';
import {USER_TABLES} from '../../../core/db/user-tables';

/**
 * Read-only bridge to the users authorities table, which belongs to the users module: authority id → authority name.
 *
 * The workflow master table stores the authority of each rule as the authority id; the signed-in actor carries
 * authority names. This file names only a users table (through USER_TABLES), never a CRM table, and never writes.
 * The users tables live in the same database as the CRM tables.
 */
const USERS_AUTHORITIES = USER_TABLES.authorities;

@Injectable()
export class UsersAuthorityLookup {
  constructor(private readonly db: CrmDatabase) {}

  async names(ids: number[]): Promise<Map<number, string>> {
    const unique = [...new Set(ids.filter(id => Number.isInteger(id)))];
    if (!unique.length) return new Map();
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT id, authority_name FROM ${USERS_AUTHORITIES} WHERE id IN (${unique.map(() => '?').join(',')})`,
      unique,
    );
    return new Map(rows.map(r => [Number(r.id), String(r.authority_name)]));
  }
}
