import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../core/db/crm-database';
import {USER_TABLES} from '../../core/db/user-tables';

/**
 * Read-only bridge to the users tables, which belong to the users module: the departments and the active users, for the picker
 * that chooses who approves an application (any user, the department of a step is only a suggestion).
 *
 * This file names only users tables (through USER_TABLES), never a CRM table, and never writes. The users tables live in the same
 * database as the CRM tables.
 */
@Injectable()
export class UsersApproversLookup {
  constructor(private readonly db: CrmDatabase) {}

  async list() {
    const [departments] = await this.db.pool.query<any[]>(
      `SELECT dept_id, department_code, department_name FROM ${USER_TABLES.departments} WHERE is_active = 1 ORDER BY dept_id`,
    );
    const [users] = await this.db.pool.query<any[]>(
      `SELECT id, username, full_name, email, dept_id, position FROM ${USER_TABLES.users} WHERE is_active = 1 ORDER BY full_name, username`,
    );
    return {departments, users};
  }
}
