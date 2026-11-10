/** One application with everything the workspace needs. */
import {pool} from '../../../core/db/pool';
import {customerFields, profileFields, picFields} from '@liugong/shared';
import {readLegal} from '../../legal/legal.repository';
import {getSubmitLock, readApplicationDocuments} from '../../documents/documents.repository';
import {readBusiness} from '../business.repository';
import {readFinancialStatements} from '../financial-statements.repository';
import {databaseValue, fapFields, picColumn, preFields, readFields} from './helpers';

export async function intakeDetail(id: string) {
  if (!pool) return null;
  const [rows] = await pool.execute<any[]>(
    `SELECT a.application_id,a.created_at app_created_at,a.updated_at app_updated_at,f.*,p.* FROM all_applications a LEFT JOIN new_application_fap_stage f ON f.id_fap_stage=a.id_fap_stage LEFT JOIN new_application_pre_analisis p ON p.id_pre_analysis=a.id_pre_analysis WHERE a.application_id=?`,
    [id],
  );
  if (!rows.length) return null;
  const row = rows[0];
  const customer = {
    ...readFields(
      row,
      fapFields.filter(f => customerFields.some(x => x.key === f.key)),
    ),
    ...readFields(
      row,
      preFields.filter(f => customerFields.some(x => x.key === f.key)),
    ),
    id: row.customer_id,
  };
  const profile = {
    ...readFields(
      row,
      fapFields.filter(f => profileFields.some(x => x.key === f.key)),
    ),
    ...readFields(
      row,
      preFields.filter(f => profileFields.some(x => x.key === f.key)),
    ),
    customerStatus: row.customer_category,
  };
  if (row.district || row.village) {
    const [pLocs] = await pool.execute<any[]>(
      `SELECT d.id AS district_master_id,v.id AS village_master_id, d.name AS district_name, v.name AS village_name FROM master_location_provinsi pr LEFT JOIN master_location_kabupaten_kota c ON c.name=? AND c.provinsi_id=pr.id LEFT JOIN master_location_kecamatan d ON (d.name=? OR d.id=?) AND d.kabupaten_kota_id=c.id LEFT JOIN master_location_kelurahan_desa v ON (v.name=? OR v.id=?) AND v.kecamatan_id=d.id WHERE pr.name=?`,
      [
        row.city || '',
        row.district || '',
        row.district || '',
        row.village || '',
        row.village || '',
        row.province || '',
      ],
    );
    if (pLocs.length) {
      profile.district = pLocs[0].district_name || row.district;
      profile.village = pLocs[0].village_name || row.village;
    }
  }
  const [pics] = await pool.execute<any[]>(
    `SELECT cp.*,d.id AS district_master_id,v.id AS village_master_id, d.name AS district_name, v.name AS village_name FROM customer_pic cp LEFT JOIN master_location_provinsi pr ON pr.name=cp.province LEFT JOIN master_location_kabupaten_kota c ON c.name=cp.city AND c.provinsi_id=pr.id LEFT JOIN master_location_kecamatan d ON (d.name=cp.kecamatan OR d.id=cp.kecamatan) AND d.kabupaten_kota_id=c.id LEFT JOIN master_location_kelurahan_desa v ON (v.name=cp.kelurahan OR v.id=cp.kelurahan) AND v.kecamatan_id=d.id WHERE cp.application_id=?`,
    [id],
  );
  const legal = await readLegal(id);
  const pic = pics[0]
    ? {
        ...Object.fromEntries(picFields.map(f => [f.key, databaseValue(pics[0][picColumn(f.key)], f.type)])),
        district: pics[0].district_name || pics[0].kecamatan,
        village: pics[0].village_name || pics[0].kelurahan,
        id: pics[0].id,
        createdAt: pics[0].created_at,
        updatedAt: pics[0].updated_at,
      }
    : null;
  const [docRows] = await pool.execute<any[]>(
    `SELECT COALESCE(MAX(is_mandatory), 0) AS is_doc_mandatory FROM application_document_checklist WHERE application_id = ?`,
    [id],
  );
  const [mandatoryList] = await pool.query<any[]>(
    'SELECT id, stage, section, field_key, field_label, mandatory FROM master_mandatory',
  );
  const mandatoryConfig = {
    customerPic: mandatoryList.some(
      r =>
        Boolean(r.section) &&
        r.section !== 'Financing' &&
        r.section !== 'Financial Statements' &&
        r.section !== 'Legal' &&
        Boolean(r.mandatory),
    ),
    financing: mandatoryList.some(r => r.section === 'Financing' && Boolean(r.mandatory)),
    financialStatements: mandatoryList.some(
      r => r.section === 'Financial Statements' && Boolean(r.mandatory),
    ),
    legal: mandatoryList.some(r => r.section === 'Legal' && Boolean(r.mandatory)),
    documents: Boolean(docRows[0]?.is_doc_mandatory),
  };
  const submitLock = await getSubmitLock(id);
  const stage =
    submitLock.stage === 'PRE_ANALYSIS' ||
    ['SUBMITTED_TO_BS', 'BS_VERIFIED', 'IN_CA_LEGAL_REVIEW', 'CREDIT_COMMITTEE_REVIEW', 'APPROVED'].includes(
      row.application_status,
    )
      ? 'Pre-analysis'
      : 'FAP Stage';
  return {
    ...profile,
    id: row.application_id,
    companyName: customer.companyName,
    customerId: row.customer_id,
    customer,
    establishmentActNo: customer.establishmentActNo,
    establishmentDate: customer.establishmentDate,
    nibDate: customer.nibDate,
    fapNumber: row.fap_registration_number,
    applicationDate: databaseValue(row.application_date, 'date'),
    createdAt: row.app_created_at,
    updatedAt: row.app_updated_at || row.updated_at,
    status: row.application_status,
    stage,
    legal,
    pic,
    stakeholders:
      legal.deeds.find((d: any) => d.id === legal.selectedDeedId)?.stakeholders ||
      legal.deeds[0]?.stakeholders ||
      [],
    ...(await readBusiness(id)),
    ...(await readFinancialStatements(id)),
    documentChecks: await readApplicationDocuments(id),
    mandatoryConfig,
    submitLock,
    approvalLogs: [],
    signoffs: [],
  };
}
