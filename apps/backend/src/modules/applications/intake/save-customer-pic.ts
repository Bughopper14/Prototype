/** Saving the customer, PIC, projects and the other page-1 data of an application. */
import {pool} from '../../../core/db/pool';
import {profileFields, picFields} from '@liugong/shared';
import {validateInput} from '@liugong/shared';
import {experienceFromEstablishmentDate} from '@liugong/shared';
import crypto from 'node:crypto';
import {
  column,
  customerDirectoryValues,
  databaseValue,
  directoryFields,
  fapFields,
  fieldValues,
  inputFields,
  mysqlError,
  picColumn,
  preFields,
  same,
  sanitizeFieldValue,
} from './helpers';
import {intakeDetail} from './detail';

export async function saveCustomerPic(id: string, body: any, fallback?: any) {
  if (!pool) throw mysqlError('MySQL is not configured', 503);
  const profile = Object.fromEntries(
    profileFields.map(f => [f.key, body.profile?.[f.key] ?? fallback?.[f.key] ?? null]),
  );
  const pic = Object.fromEntries(picFields.map(f => [f.key, body.pic?.[f.key] ?? null]));
  try {
    validateInput(profile);
    validateInput(pic);
  } catch (e: any) {}
  const current = await intakeDetail(id);
  const customerInput = body.customer || {};
  const customer = {...(current?.customer || {}), ...customerInput};
  const experience = experienceFromEstablishmentDate(customer?.establishmentDate);
  const fapData: Record<string, any> = Object.fromEntries(
    fapFields.map(f => {
      if (f.key === 'experienceYears') return [column(f.key), experience.experienceYears ?? 0];
      if (f.key === 'experienceMonths') return [column(f.key), experience.experienceMonths ?? 0];
      let val: any = undefined;
      if (customer && customer[f.key] !== undefined && customer[f.key] !== null) {
        val = customer[f.key];
      } else if (profile && profile[f.key] !== undefined && profile[f.key] !== null) {
        val = profile[f.key];
      }
      return [column(f.key), sanitizeFieldValue(val, f.type)];
    }),
  );
  const preData = inputFields({...customer, ...profile}, preFields);
  if (Object.hasOwn(profile, 'customerStatus') && profile.customerStatus)
    fapData.customer_category = profile.customerStatus;
  const c = await pool.getConnection();
  let changed = false;
  try {
    await c.beginTransaction();
    const [app] = await c.execute<any[]>(
      'SELECT id_fap_stage,id_pre_analysis FROM all_applications WHERE application_id=? FOR UPDATE',
      [id],
    );
    if (!app.length) throw mysqlError('Application not found', 404);
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
    const storedPic = {...pic};
    if (pic.district) {
      try {
        const [districts] = await c.execute<any[]>(
          `SELECT d.id,d.name,c.name AS city_name,p.name AS province_name FROM master_location_kecamatan d JOIN master_location_kabupaten_kota c ON c.id=d.kabupaten_kota_id JOIN master_location_provinsi p ON p.id=c.provinsi_id WHERE (d.id=? OR d.name=?) AND (?='' OR c.name=?) AND (?='' OR p.name=?)`,
          [
            pic.district,
            pic.district,
            pic.city || '',
            pic.city || '',
            pic.province || '',
            pic.province || '',
          ],
        );
        if (districts.length >= 1) {
          const district = districts[0];
          storedPic.district = district.name;
          if (pic.village) {
            const [villages] = await c.execute<any[]>(
              'SELECT id,name FROM master_location_kelurahan_desa WHERE (id=? OR name=?) AND kecamatan_id=?',
              [pic.village, pic.village, district.id],
            );
            if (villages.length >= 1) storedPic.village = villages[0].name;
            else storedPic.village = pic.village;
          }
        } else {
          storedPic.district = pic.district;
          storedPic.village = pic.village;
        }
      } catch {
        storedPic.district = pic.district;
        storedPic.village = pic.village;
      }
    } else if (pic.village) {
      storedPic.village = pic.village;
    }
    const updateTable = async (
      table: string,
      idColumn: string,
      rowId: string,
      values: Record<string, any>,
    ) => {
      const [old] = await c.execute<any[]>(`SELECT * FROM ${table} WHERE ${idColumn}=? FOR UPDATE`, [rowId]);
      if (!old.length) throw mysqlError('Application stage was not found', 404);
      const sanitizedValues: Record<string, any> = {};
      for (const [k, v] of Object.entries(values)) {
        sanitizedValues[k] = v === '' || v === undefined ? null : v;
      }
      const keys = Object.keys(sanitizedValues);
      const isChanged = keys.some(
        k => !same(databaseValue(old[0][k], 'date'), databaseValue(sanitizedValues[k], 'date')),
      );
      if (isChanged) {
        await c.execute(
          `UPDATE ${table} SET ${keys.map(k => `\`${k}\`=?`).join(',')},updated_at=CURRENT_TIMESTAMP(3) WHERE ${idColumn}=?`,
          [...Object.values(sanitizedValues), rowId],
        );
        changed = true;
      }
    };
    await updateTable('new_application_fap_stage', 'id_fap_stage', app[0].id_fap_stage, fapData);
    await updateTable('new_application_pre_analisis', 'id_pre_analysis', app[0].id_pre_analysis, preData);
    const rawDirectoryData: Record<string, any> = customerDirectoryValues(
      {...customer, ...experience},
      profile,
      profile.customerStatus || current?.customerStatus || 'EXISTING',
    );
    const directoryData: Record<string, any> = Object.fromEntries(
      Object.entries(rawDirectoryData).map(([k, v]) => [k, v === '' || v === undefined ? null : v]),
    );
    const directoryKeys = Object.keys(directoryData);
    const [directoryRows] = await c.execute<any[]>(
      'SELECT * FROM master_cust_n_pic_business_partner WHERE id=? FOR UPDATE',
      [current?.customerId],
    );
    if (!directoryRows.length) {
      await c.execute(
        `INSERT INTO master_cust_n_pic_business_partner (id,${directoryKeys.map(k => `\`${k}\``).join(',')}) VALUES (${Array(
          directoryKeys.length + 1,
        )
          .fill('?')
          .join(',')})`,
        [current?.customerId, ...Object.values(directoryData)],
      );
      changed = true;
    } else {
      const directoryChanged =
        directoryFields.some(
          f =>
            !same(
              databaseValue(directoryRows[0][column(f.key)], f.type),
              databaseValue(directoryData[column(f.key)], f.type),
            ),
        ) || !same(directoryRows[0].customer_relationship, directoryData.customer_relationship);
      if (directoryChanged) {
        await c.execute(
          `UPDATE master_cust_n_pic_business_partner SET ${directoryKeys.map(k => `\`${k}\`=?`).join(',')},updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,
          [...Object.values(directoryData), current?.customerId],
        );
        changed = true;
      }
    }
    const [existing] = await c.execute<any[]>(
      'SELECT * FROM customer_pic WHERE application_id=? FOR UPDATE',
      [id],
    );
    const picNonempty = Object.values(pic).some(v => v !== null && v !== '');
    const picChanged =
      !existing.length ||
      picFields.some(f => !same(databaseValue(existing[0][picColumn(f.key)], f.type), storedPic[f.key]));
    if ((existing.length || picNonempty) && picChanged) {
      const keys = picFields.map(f => picColumn(f.key)),
        values = fieldValues(storedPic, picFields);
      if (existing.length)
        await c.execute(
          `UPDATE customer_pic SET ${keys.map(k => `\`${k}\`=?`).join(',')},updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?`,
          [...values, id],
        );
      else {
        const [stage] = await c.execute<any[]>(
          'SELECT customer_id FROM new_application_fap_stage WHERE id_fap_stage=?',
          [app[0].id_fap_stage],
        );
        await c.execute(
          `INSERT INTO customer_pic (id,application_id,customer_id,${keys.map(k => `\`${k}\``).join(',')}) VALUES (${Array(
            keys.length + 3,
          )
            .fill('?')
            .join(',')})`,
          [crypto.randomUUID(), id, stage[0].customer_id, ...values],
        );
      }
      changed = true;
    }
    if (changed)
      await c.execute('UPDATE all_applications SET updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?', [
        id,
      ]);
    await c.commit();
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
  return intakeDetail(id);
}
