/** The customer directory. */
import {pool} from '../../../core/db/pool';
import {databaseValue} from './helpers';
import {listIntake} from './list';

export async function intakeCustomers() {
  const customerMap = new Map<string, any>();
  if (pool) {
    try {
      const [bpRows] = await pool.query<any[]>(
        `SELECT id, company_name AS companyName, company_type AS companyType, nib, DATE_FORMAT(nib_date, '%Y-%m-%d') AS nibDate, npwp, establishment_act_no AS establishmentActNo, DATE_FORMAT(establishment_date, '%Y-%m-%d') AS establishmentDate, created_at AS createdAt, updated_at AS updatedAt FROM master_cust_n_pic_business_partner ORDER BY created_at DESC`,
      );
      for (const r of bpRows) {
        customerMap.set(r.id, {
          id: r.id,
          companyName: r.companyName,
          companyType: r.companyType,
          nib: r.nib,
          nibDate: databaseValue(r.nibDate, 'date'),
          npwp: r.npwp,
          establishmentActNo: r.establishmentActNo,
          establishmentDate: databaseValue(r.establishmentDate, 'date'),
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
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
      if (!existing.createdAt && r.created_at) existing.createdAt = r.created_at;
      if (
        !existing.firstApplicationDate ||
        (appDate && new Date(appDate) < new Date(existing.firstApplicationDate))
      ) {
        existing.firstApplicationDate = appDate;
      }
    } else {
      customerMap.set(r.customer_id, {
        id: r.customer_id,
        companyName: r.company_name,
        companyType: r.company_type,
        nib: r.nib,
        nibDate: databaseValue(r.nib_date, 'date'),
        npwp: r.npwp,
        establishmentActNo: r.establishment_act_no,
        establishmentDate: databaseValue(r.establishment_date, 'date'),
        createdAt: r.created_at,
        firstApplicationDate: appDate,
      });
    }
  }
  return Array.from(customerMap.values());
}
