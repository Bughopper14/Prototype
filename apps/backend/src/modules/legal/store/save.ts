/** Saves the deeds and stakeholders of an application. */
import {pool} from '../../../core/db/pool';
import crypto from 'node:crypto';
import {validateInput} from '@liugong/shared';
import Decimal from 'decimal.js';
import {ageFromDateOfBirth} from '@liugong/shared';
import {stakeholderFields} from '@liugong/shared';
import {col, mapStakeholder, upsert} from './helpers';
import {stakeholderLocationNames} from './locations';
import {readLegal} from './read';

export async function saveLegal(applicationId: string, incoming: any, final = false) {
  if (!pool) throw Error('MySQL is not configured');
  const rawList = Array.isArray(incoming)
    ? incoming
    : Array.isArray(incoming?.deeds)
      ? incoming.deeds
      : incoming
        ? [incoming]
        : [];
  if (!Array.isArray(rawList)) throw Object.assign(Error('Daftar akta tidak valid'), {status: 422});
  const deeds = structuredClone(rawList),
    ids = new Set<string>();
  const seenDeedNumbers = new Map<string, string>();
  for (const d of deeds) {
    const rawNo = String(d.deedNumber || '')
      .trim()
      .toLowerCase();
    if (rawNo) {
      if (seenDeedNumbers.has(rawNo)) {
        throw Object.assign(Error('This deed number has already been entered in this application.'), {
          status: 422,
        });
      }
      seenDeedNumbers.set(rawNo, d.id || '');
    }
  }
  for (let i = 0; i < deeds.length; i++) {
    const d = deeds[i];
    d.id = d.id || crypto.randomUUID();
    if (ids.has(d.id)) d.id = crypto.randomUUID();
    if (!['establishment', 'amendment'].includes(d.type)) {
      d.type = i === 0 ? 'establishment' : 'amendment';
    }
    ids.add(d.id);
    if (final) {
      for (const key of ['deedNumber', 'deedDate', 'ministerialDecreeNumber', 'ministerialDecreeDate'])
        if (!d[key]) throw Object.assign(Error(key + ' wajib diisi sebelum submit'), {status: 422});
      validateInput({...d, stakeholders: undefined});
    }
    d._stakeholdersPassed = d.stakeholders !== undefined && d.stakeholders !== null;
    d.stakeholders = d.stakeholders || [];
    let total = new Decimal(0);
    const stakeholderIds = new Set<string>();
    for (const s of d.stakeholders) {
      s.id = s.id || crypto.randomUUID();
      if (stakeholderIds.has(s.id)) s.id = crypto.randomUUID();
      stakeholderIds.add(s.id);
      if (final) {
        validateInput(s);
        if (
          !s.email ||
          !s.mobilePhone ||
          s.primaryCapital === undefined ||
          s.primaryCapital === null ||
          s.primaryCapital === ''
        )
          throw Object.assign(Error('Email, Mobile phone dan Primary capital wajib diisi sebelum submit'), {
            status: 422,
          });
        if (![s.firstName, s.lastName, s.name].some((x: any) => String(x || '').trim()))
          throw Object.assign(Error('Nama stakeholder wajib diisi sebelum submit'), {status: 422});
      }
      const pct = new Decimal(s.sharePercentage || 0);
      total = total.plus(pct);
    }
    if (final && !total.eq(100))
      throw Object.assign(Error('Total Percentage share pada setiap akta wajib tepat 100% sebelum submit.'), {
        status: 422,
      });
  }
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    await c.execute('SELECT application_id FROM all_applications WHERE application_id=? FOR UPDATE', [
      applicationId,
    ]);
    for (const d of deeds) {
      // A deed built in the browser from the FAP (system-/legacy- id) that is already stored keeps its row
      if (!d.id || d.id.startsWith('system-') || d.id.startsWith('legacy-')) {
        const [match] = await c.execute<any[]>(
          "SELECT id FROM daftar_akta WHERE application_id=? AND deleted_at IS NULL AND (LOWER(TRIM(nomor_akta))=LOWER(TRIM(?)) OR (akta=? AND ?='establishment')) LIMIT 1",
          [
            applicationId,
            d.deedNumber || '',
            d.type === 'establishment' ? 'Akta pendirian' : 'Akta perubahan',
            d.type,
          ],
        );
        if (match[0]?.id) d.id = match[0].id;
      }
      if (!d._stakeholdersPassed) {
        const [existingRows] = await c.execute<any[]>(
          'SELECT s.*, COALESCE(k.document_path, pass.document_path) AS document_path, COALESCE(k.file_name, pass.file_name) AS file_name, d.id AS district_master_id, v.id AS village_master_id FROM legal_stakeholder s LEFT JOIN ktp k ON (k.stakeholder_id=s.id OR (s.id_number IS NOT NULL AND s.id_number != "" AND k.nik=s.id_number AND k.document_path IS NOT NULL)) LEFT JOIN passport pass ON (pass.stakeholder_id=s.id OR (s.id_number IS NOT NULL AND s.id_number != "" AND pass.passport_number=s.id_number AND pass.document_path IS NOT NULL)) LEFT JOIN master_location_provinsi p ON (p.name=s.province OR p.id=s.province) LEFT JOIN master_location_kabupaten_kota c ON (c.name=s.city_regency OR c.id=s.city_regency) AND c.provinsi_id=p.id LEFT JOIN master_location_kecamatan d ON (d.name=s.district OR d.id=s.district) AND d.kabupaten_kota_id=c.id LEFT JOIN master_location_kelurahan_desa v ON (v.name=s.village OR v.id=s.village) AND v.kecamatan_id=d.id WHERE s.akta_id=? AND s.deleted_at IS NULL ORDER BY s.created_at,s.id',
          [d.id],
        );
        if (existingRows.length > 0) d.stakeholders = existingRows.map(mapStakeholder);
      }
      const deedDateStr = d.deedDate ? String(d.deedDate).slice(0, 10).trim() || null : null;
      const skDateStr = d.ministerialDecreeDate
        ? String(d.ministerialDecreeDate).slice(0, 10).trim() || null
        : null;
      const expiry = deedDateStr ? new Date(deedDateStr + 'T00:00:00Z') : null;
      if (expiry) expiry.setUTCFullYear(expiry.getUTCFullYear() + 5);
      const until = expiry ? expiry.toISOString().slice(0, 10) : null;
      const active = until ? until >= new Date().toISOString().slice(0, 10) : true;
      const assignedDeedId = await upsert(c, 'daftar_akta', d.id, {
        application_id: applicationId,
        akta: d.type === 'establishment' ? 'Akta pendirian' : 'Akta perubahan',
        nomor_akta: d.deedNumber || '',
        tanggal: deedDateStr || new Date().toISOString().slice(0, 10),
        status: active ? 'Aktif' : 'Tidak aktif',
        berlaku_sampai: until,
        sk_menteri: d.ministerialDecreeNumber || null,
        tanggal_sk_menteri: skDateStr,
        kategori_remarks: d.remarkCategoryId || null,
        remarks: d.remarks || null,
        representative: d.parties?.representative || null,
        pemegang_saham_perusahaan: d.parties?.companyShareholder || null,
        stakeholders: d.stakeholders.length,
        jumlah_shareholder: d.stakeholders.filter((s: any) => Number(s.sharePercentage) > 0).length,
        total_kepemilikan: d.stakeholders
          .reduce((v: Decimal, s: any) => v.plus(s.sharePercentage || 0), new Decimal(0))
          .toFixed(2),
        is_selected: Boolean(d.id === incoming.selectedDeedId),
      });
      d.id = assignedDeedId;

      for (const s of d.stakeholders) {
        if (s.dateOfBirth) {
          Object.assign(s, ageFromDateOfBirth(s.dateOfBirth));
        }
        if (!s.firstName && (s.name || s.fullName)) {
          const parts = String(s.name || s.fullName || '')
            .trim()
            .split(/\s+/);
          s.firstName = parts[0] || '';
          s.middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
          s.lastName = parts.length > 1 ? parts.slice(-1)[0] : '';
        }
        const stored = await stakeholderLocationNames(c, s);
        const value = Object.fromEntries(
          stakeholderFields.map(f => {
            let val = stored[f.key];
            if (val === '' || val === undefined) val = null;
            if (f.type === 'number' && val !== null) {
              const num = Number(val);
              val = isNaN(num) ? null : num;
            }
            if (f.type === 'date' && val !== null) {
              val = String(val).slice(0, 10).trim() || null;
            }
            return [col(f.key), val];
          }),
        );
        const [old] = await c.execute<any[]>(
          'SELECT id FROM legal_stakeholder WHERE id=? AND akta_id=? AND application_id=?',
          [s.id, d.id, applicationId],
        );
        const assignedStakeholderId = await upsert(c, 'legal_stakeholder', old[0]?.id || s.id, {
          akta_id: d.id,
          application_id: applicationId,
          ...value,
        });
        s.id = assignedStakeholderId;
      }
      const stakeholderIds = d.stakeholders.map((s: any) => s.id);
      if (d._stakeholdersPassed) {
        await c.execute(
          `UPDATE legal_stakeholder SET deleted_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE akta_id=? AND deleted_at IS NULL ${stakeholderIds.length ? 'AND id NOT IN (' + stakeholderIds.map(() => '?').join(',') + ')' : ''}`,
          [d.id, ...stakeholderIds],
        );
      }
    }
    const savedIds = deeds.map((d: any) => d.id);
    for (const table of ['legal_stakeholder', 'daftar_akta'])
      await c.execute(
        `UPDATE ${table} SET deleted_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=? AND deleted_at IS NULL ${savedIds.length ? 'AND ' + (table === 'daftar_akta' ? 'id' : 'akta_id') + ' NOT IN (' + savedIds.map(() => '?').join(',') + ')' : ''}`,
        [applicationId, ...savedIds],
      );
    const estDeed = deeds.find((d: any) => d.type === 'establishment');
    if (estDeed && estDeed.deedNumber) {
      await c.execute(
        'UPDATE new_application_fap_stage f JOIN all_applications a ON a.id_fap_stage = f.id_fap_stage SET f.establishment_act_no = ?, f.establishment_date = ? WHERE a.application_id = ?',
        [estDeed.deedNumber, estDeed.deedDate ? String(estDeed.deedDate).slice(0, 10) : null, applicationId],
      );
    }
    const amendments = deeds
      .filter((d: any) => d.type === 'amendment' && d.deedDate)
      .sort(
        (a: any, b: any) =>
          String(b.deedDate).localeCompare(String(a.deedDate)) ||
          String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
      );
    if (amendments.length > 0 && amendments[0].deedNumber) {
      await c.execute(
        'UPDATE new_application_pre_analisis p JOIN all_applications a ON a.id_pre_analysis = p.id_pre_analysis SET p.latest_deed_no = ?, p.latest_deed_date = ? WHERE a.application_id = ?',
        [
          amendments[0].deedNumber,
          amendments[0].deedDate ? String(amendments[0].deedDate).slice(0, 10) : null,
          applicationId,
        ],
      );
    }
    await c.commit();
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
  return readLegal(applicationId);
}
