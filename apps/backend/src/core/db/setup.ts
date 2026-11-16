import {pool} from './pool';
import {USER_TABLES} from './user-tables';
import {ensureUsersSchemaColumns} from '../../modules/users/users.repository';

/**
 * Verifies the normalized `crm_liugong1` schema is present and ensures
 * incremental compatibility columns (such as user management merged columns) are aligned.
 */
export async function runSetup() {
  if (!pool) return;
  await pool.query(`SELECT 1 FROM ${USER_TABLES.users} LIMIT 1`);
  await pool.query('SELECT 1 FROM crm_applications LIMIT 1');
  await pool.query('SELECT 1 FROM crm_pre_analysis_forms LIMIT 1');
  await ensureUsersSchemaColumns();
}
