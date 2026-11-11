/** The customer directory. */
import {picFields} from '@liugong/shared';
import {pool} from '../../../core/db/pool';
import {column, databaseValue, directoryFields, picColumn, readFields} from './helpers';
import {listIntake} from './list';

export async function intakeCustomers() {
  const customerMap = new Map<string, any>();
  if (pool) {
    try {
      const [bpRows] = await pool.query<any[]>(
        `SELECT * FROM master_cust_n_pic_business_partner ORDER BY created_at DESC`,
      );
      const picMap = new Map<string, any>();
      try {
        const [picRows] = await pool.query<any[]>(
          `SELECT * FROM customer_pic ORDER BY COALESCE(updated_at, created_at) DESC`,
        );
        for (const p of picRows) {
          if (!p.customer_id || picMap.has(p.customer_id)) continue;
          picMap.set(
            p.customer_id,
            Object.fromEntries(picFields.map(f => [f.key, databaseValue(p[picColumn(f.key)], f.type)])),
          );
        }
      } catch (picErr) {
        console.warn('intakeCustomers customer_pic query error:', picErr);
      }

      for (const r of bpRows) {
        customerMap.set(r.id, {
          ...readFields(r, directoryFields),
          id: r.id,
          businessPartnerType: r.business_partner_type,
          customerRelationship: r.customer_relationship,
          pic: picMap.get(r.id) || null,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        });
      }
    } catch (e) {
      console.warn('intakeCustomers master_cust_n_pic_business_partner query error:', e);
    }
  }
  const rows = await listIntake();
  for (const r of rows) {
    if (!r.customer_id) continue;
    const existing = customerMap.get(r.customer_id);
    const appDate = r.application_date || r.created_at;
    if (existing) {
      for (const f of directoryFields) {
        const cur = existing[f.key];
        const fallbackVal = r[column(f.key)];
        if (
          (cur === undefined || cur === null || cur === '') &&
          fallbackVal !== undefined &&
          fallbackVal !== null &&
          fallbackVal !== ''
        ) {
          existing[f.key] = databaseValue(fallbackVal, f.type);
        }
      }
      if (!existing.createdAt && r.created_at) existing.createdAt = r.created_at;
      if (
        !existing.firstApplicationDate ||
        (appDate && new Date(appDate) < new Date(existing.firstApplicationDate))
      ) {
        existing.firstApplicationDate = appDate;
      }
    } else {
      customerMap.set(r.customer_id, {
        ...readFields(r, directoryFields),
        id: r.customer_id,
        pic: null,
        createdAt: r.created_at,
        firstApplicationDate: appDate,
      });
    }
  }
  return Array.from(customerMap.values());
}
