/** Reads the deeds and stakeholders of an application. */
import {pool} from '../../../core/db/pool';
import {asDate, mapStakeholder} from './helpers';

export async function readLegal(applicationId: string) {
  if (!pool) return {deeds: []};
  const [rows] = await pool.execute<any[]>(
    'SELECT * FROM daftar_akta WHERE application_id=? AND deleted_at IS NULL ORDER BY created_at,id',
    [applicationId],
  );
  const deeds = await Promise.all(
    rows.map(async row => {
      const [stakeholders] = await pool!.execute<any[]>(
        `SELECT s.*, COALESCE(k.document_path, pass.document_path) AS document_path, COALESCE(k.file_name, pass.file_name) AS file_name, d.id AS district_master_id, v.id AS village_master_id FROM legal_stakeholder s LEFT JOIN ktp k ON (k.stakeholder_id=s.id OR (s.id_number IS NOT NULL AND s.id_number != "" AND k.nik=s.id_number AND k.document_path IS NOT NULL)) LEFT JOIN passport pass ON (pass.stakeholder_id=s.id OR (s.id_number IS NOT NULL AND s.id_number != "" AND pass.passport_number=s.id_number AND pass.document_path IS NOT NULL)) LEFT JOIN master_location_provinsi p ON (p.name=s.province OR p.id=s.province) LEFT JOIN master_location_kabupaten_kota c ON (c.name=s.city_regency OR c.id=s.city_regency) AND c.provinsi_id=p.id LEFT JOIN master_location_kecamatan d ON (d.name=s.district OR d.id=s.district) AND d.kabupaten_kota_id=c.id LEFT JOIN master_location_kelurahan_desa v ON (v.name=s.village OR v.id=s.village) AND v.kecamatan_id=d.id WHERE s.akta_id=? AND s.deleted_at IS NULL ORDER BY s.created_at,s.id`,
        [row.id],
      );
      const isEstablishment = row.akta === 'Akta pendirian' || /pendirian/i.test(row.akta);
      return {
        id: row.id,
        type: isEstablishment ? 'establishment' : 'amendment',
        deedNumber: row.nomor_akta,
        deedDate: asDate(row.tanggal),
        ministerialDecreeNumber: row.sk_menteri,
        ministerialDecreeDate: asDate(row.tanggal_sk_menteri),
        remarkCategoryId: row.kategori_remarks || null,
        remarks: row.remarks || '',
        parties: {
          representative: row.representative || '',
          companyShareholder: row.pemegang_saham_perusahaan || '',
        },
        status: row.status,
        expiryDate: asDate(row.berlaku_sampai),
        shareholders: Number(row.jumlah_shareholder),
        stakeholders: stakeholders.map(mapStakeholder),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        infoAdded: stakeholders.length > 0,
      };
    }),
  );
  const [reviews] = await pool.execute<any[]>(
    'SELECT deed_id,review FROM deed_review WHERE application_id=?',
    [applicationId],
  );
  for (const row of reviews) {
    const deed = deeds.find((d: any) => d.id === row.deed_id);
    if (deed) Object.assign(deed, JSON.parse(row.review));
  }
  const [hidden] = await pool.execute<any[]>(
    'SELECT id FROM daftar_akta WHERE application_id=? AND deleted_at IS NOT NULL',
    [applicationId],
  );
  return {
    deeds,
    hiddenDeedIds: hidden.map(r => r.id),
    selectedDeedId: rows.find(r => r.is_selected)?.id || deeds[0]?.id,
  };
}
