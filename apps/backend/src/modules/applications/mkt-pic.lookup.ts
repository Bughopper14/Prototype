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

  /** The name (full name, else username) of each user id; ids that do not exist are left out. */
  async names(ids: Iterable<number | null | undefined>): Promise<Map<number, {name: string; username: string}>> {
    const wanted = [...new Set([...ids].map(Number).filter(n => Number.isInteger(n) && n > 0))];
    if (!wanted.length) return new Map();
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT id, username, full_name FROM ${USER_TABLES.users} WHERE id IN (${wanted.map(() => '?').join(',')})`,
      wanted,
    );
    return new Map(rows.map(r => [Number(r.id), {name: String(r.full_name || r.username || ''), username: String(r.username || '')}]));
  }
}
