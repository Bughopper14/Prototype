import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';

/**
 * Read-only bridge to users_authorities, which belongs to the users module: authority id → authority name.
 *
 * crm_master_workflow stores the authority of each rule as users_authorities.id; the signed-in actor carries authority
 * names. This file is the only CRM code that names a users_ table, it never names a crm_ table, and it never writes.
 * users_authorities lives in the same database as the CRM tables.
 */
const USERS_AUTHORITIES = '`users_authorities`';

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
