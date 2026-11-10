/** Creating an application. */
import {pool} from '../../../core/db/pool';
import {validateInput, businessToday} from '@liugong/shared';
import crypto from 'node:crypto';
import {experienceFromEstablishmentDate} from '@liugong/shared';
import {seedApplicationDocuments} from '../../documents/documents.repository';
import {customerDirectoryValues, fapFields, inputFields, mysqlError, preFields} from './helpers';

export async function createIntake(body: any, identity?: {id: string; fapNumber?: string; status?: string}) {
  if (!pool) throw mysqlError('MySQL is not configured', 503);
  const customer = body.customer || {},
    profile = body.profile || {},
    category = body.customerCategory || 'NEW';
  try {
    validateInput(customer);
    validateInput(profile);
  } catch (e: any) {}
  const compName = String(customer.companyName || '').trim() || 'Perusahaan Baru (Draft)';
  const nibRaw = String(customer.nib || '').replace(/\D/g, '');
  const nibVal = nibRaw.length === 13 ? nibRaw : (nibRaw || '0000000000000').padEnd(13, '0').slice(0, 13);
  const npwpRaw = String(customer.npwp || '').replace(/\D/g, '');
  const npwpVal = npwpRaw.length >= 15 ? npwpRaw : '';
  const normalizedCustomer = {
    ...customer,
    companyName: compName,
    nib: nibVal,
    npwp: npwpVal,
    companyType: customer.companyType || 'CORPORATE',
  };
  if (category === 'EXISTING' && !body.customerId) throw mysqlError('Select an existing customer');
  const companyId = category === 'EXISTING' ? String(body.customerId) : crypto.randomUUID();
  const experience = experienceFromEstablishmentDate(normalizedCustomer.establishmentDate);
  const normalizedProfile = {...profile, ...experience};
  try {
    validateInput(normalizedProfile);
  } catch (e: any) {}
  const appId = identity?.id || crypto.randomUUID(),
    fapId = crypto.randomUUID(),
    preId = crypto.randomUUID();
  const today = businessToday();
  const c = await pool.getConnection();
  let lock = false;
  try {
    await c.beginTransaction();
    await c.query("SELECT GET_LOCK(CONCAT('lfi-fap-',YEAR(CURRENT_DATE)),10)");
    lock = true;
    const [numberRows] = await c.execute<any[]>(
      `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(fap_registration_number, '/', 1) AS UNSIGNED)), 0) AS n FROM new_application_fap_stage WHERE fap_registration_number LIKE ?`,
      [`%/AF/%/${today.slice(0, 4)}`],
    );
    const months = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const fap =
      identity?.fapNumber ||
      `${String(Number(numberRows[0].n) + 1).padStart(3, '0')}/AF/${months[Number(today.slice(5, 7)) - 1]}/${today.slice(0, 4)}`;
    const fapData: Record<string, any> = {
      ...inputFields({...normalizedCustomer, ...normalizedProfile}, fapFields),
      customer_category: category,
      customer_id: companyId,
      application_date: today,
      fap_registration_number: fap,
    };
    if (fapData.district) {
      const [districts] = await c.execute<any[]>(
        `SELECT d.name FROM master_location_kecamatan d WHERE d.id=? OR d.name=?`,
        [fapData.district, fapData.district],
      );
      if (districts.length) fapData.district = districts[0].name;
      if (fapData.village) {
        const [villages] = await c.execute<any[]>(
          `SELECT v.name FROM master_location_kelurahan_desa v WHERE v.id=? OR v.name=?`,
          [fapData.village, fapData.village],
        );
        if (villages.length) fapData.village = villages[0].name;
      }
    }
    const preData = {
      ...inputFields({...normalizedCustomer, ...normalizedProfile}, preFields),
      application_status: identity?.status || 'DRAFT',
    };
    const insertRow = async (table: string, values: Record<string, any>) => {
      const keys = Object.keys(values);
      await c.execute(
        `INSERT INTO ${table} (${keys.map(k => `\`${k}\``).join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
        Object.values(values),
      );
    };
    const directoryData: Record<string, any> = customerDirectoryValues(
      normalizedCustomer,
      normalizedProfile,
      normalizedProfile.customerStatus || category,
    );
    const directoryKeys = Object.keys(directoryData);
    await c.execute(
      `INSERT IGNORE INTO master_cust_n_pic_business_partner (id,${directoryKeys.map(k => `\`${k}\``).join(',')}) VALUES (${Array(
        directoryKeys.length + 1,
      )
        .fill('?')
        .join(',')})`,
      [companyId, ...Object.values(directoryData)],
    );
    await insertRow('new_application_fap_stage', {id_fap_stage: fapId, ...fapData});
    await insertRow('new_application_pre_analisis', {id_pre_analysis: preId, ...preData});
    await insertRow('all_applications', {application_id: appId, id_fap_stage: fapId, id_pre_analysis: preId});
    await seedApplicationDocuments(c, appId);
    await c.execute(
      `
     INSERT INTO application_submit_lock (application_id, is_locked, stage, fap_doc_uploaded)
     VALUES (?, 1, 'FAP_STAGE', 0)
     ON DUPLICATE KEY UPDATE is_locked = 1, fap_doc_uploaded = 0
   `,
      [appId],
    );
    await c.commit();
    return {id: appId};
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    if (lock)
      try {
        await c.query("SELECT RELEASE_LOCK(CONCAT('lfi-fap-',YEAR(CURRENT_DATE)))");
      } catch {}
    c.release();
  }
}
