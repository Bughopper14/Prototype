/** Schema verification for legal deeds, reviews, and stakeholders on crm_liugong1. */
import {pool} from '../../../core/db/pool';

export async function initializeLegal() {
  await pool.query('SELECT 1 FROM crm_fap_legal_deeds LIMIT 1');
}
