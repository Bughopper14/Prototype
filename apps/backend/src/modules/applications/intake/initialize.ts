/** Schema verification & startup initialization for CRM intake on crm_liugong1. */
import {pool} from '../../../core/db/pool';

export async function initializeIntake() {
  await pool.query('SELECT 1 FROM crm_applications LIMIT 1');
}

export async function migrateCustomerPicLocations() {
  // Locations are normalized in crm_master_* FKs on crm_liugong1; no legacy column migration needed.
}
