/** Frozen FAP tables are provisioned by plan-schema.sql in crm_liugong1; runtime initialization is a no-op. */
import {pool} from '../../../core/db/pool';

export async function initializeFapArchive(): Promise<void> {
  if (!pool) return;
  try {
    await pool.query('SELECT 1 FROM crm_frozen_fap_applications LIMIT 1');
  } catch (err) {
    console.warn('initializeFapArchive check error:', err);
  }
}
