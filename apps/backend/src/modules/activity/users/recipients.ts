import {pool} from '../../../core/db/pool';
import {USER_TABLES} from '../../../core/db/user-tables';

/**
 * Read-only bridge to the users tables: which active users hold an authority, and the id of a username. Used to pick
 * notification recipients. This file names only users tables (through USER_TABLES), never a CRM table, and never writes.
 */

/** Active users whose role matches or grants any of the given authority names or role names in the CRM app. */
export async function holdersOf(authorityNames: string[]): Promise<number[]> {
  const names = [...new Set(authorityNames.filter(Boolean))];
  if (!names.length) return [];
  const [rows] = await pool.query<any[]>(
    `SELECT DISTINCT u.id FROM ${USER_TABLES.users} u
     JOIN ${USER_TABLES.user_app_roles} uar ON uar.user_id = u.id
     JOIN ${USER_TABLES.roles} r ON r.id = uar.role_id
     LEFT JOIN ${USER_TABLES.role_authorities} ra ON ra.role_id = uar.role_id
     LEFT JOIN ${USER_TABLES.authorities} au ON au.id = ra.authority_id AND au.app_id = uar.app_id
     WHERE u.is_active = 1 AND (
       au.authority_name IN (${names.map(() => '?').join(',')})
       OR r.role_name IN (${names.map(() => '?').join(',')})
     )`,
    [...names, ...names],
  );
  return rows.map(r => Number(r.id));
}

/** Ids of active users by username (the CRM tables record who acted by username). */
export async function idsOf(usernames: string[]): Promise<number[]> {
  const names = [...new Set(usernames.filter(Boolean))];
  if (!names.length) return [];
  const [rows] = await pool.query<any[]>(
    `SELECT id FROM ${USER_TABLES.users} WHERE is_active = 1 AND username IN (${names.map(() => '?').join(',')})`,
    names,
  );
  return rows.map(r => Number(r.id));
}
