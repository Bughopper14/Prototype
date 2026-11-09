import {validateMasterCatalog, type MasterCatalog} from '@liugong/shared';
import {Controller, Get, Put, Res} from '@nestjs/common';
import {pool} from '../../core/db/pool';
import {Problem, ensure} from '../../core/domain';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {Public} from '../../core/http/public.decorator';
import {invalidateMasterData, masterData, masterDataGzip} from './master-data.cache';
import {saveBusinessMasters} from './repositories/business-masters.repository';
import {saveCustomerMasters} from './repositories/customer-masters.repository';
import {saveDocumentMasters} from './repositories/document-masters.repository';
import {saveEquipmentMasters} from './repositories/equipment-masters.repository';
import {saveFinanceMasters} from './repositories/finance-masters.repository';
import {saveLegalMasters} from './repositories/legal-masters.repository';
import {saveLocations} from './repositories/location.repository';
import {requireAuthority} from '../auth/session';

/* ---------- mandatory-field rules ---------- */

const MANDATORY_SQL =
  'SELECT id, stage, section, field_key, field_label, mandatory FROM master_mandatory ORDER BY stage, section, id';

const listMandatory = async () => (await pool.query<any[]>(MANDATORY_SQL))[0];

/* ---------- wilayah (location) reverse lookup ---------- */

const clean = (s: unknown) =>
  String(s || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();

const VILLAGE_SELECT = `SELECT v.id AS village_id, v.name AS village_name, v.postal_code,
  d.id AS district_id, d.name AS district_name, c.id AS city_id, c.name AS city_name, p.id AS province_id, p.name AS province_name
  FROM master_kelurahan_desa v JOIN master_kecamatan d ON v.kecamatan_id=d.id
  JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id JOIN master_provinsi p ON c.provinsi_id=p.id`;

const DISTRICT_SELECT = `SELECT NULL AS village_id, NULL AS village_name, NULL AS postal_code,
  d.id AS district_id, d.name AS district_name, c.id AS city_id, c.name AS city_name, p.id AS province_id, p.name AS province_name
  FROM master_kecamatan d JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id JOIN master_provinsi p ON c.provinsi_id=p.id`;

@Controller(API_PREFIX)
export class MasterDataController {
  @Get('master-data')
  async catalog(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const data = await masterData();
    const etag = `W/"master-${data.revision}-${masterDataGzip(data).length}"`;
    res.setHeader('ETag', etag).setHeader('Cache-Control', 'private, no-cache');
    if (req.headers.get('if-none-match') === etag) return res.status(304).end();
    if (String(req.headers.get('accept-encoding') || '').includes('gzip')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8').setHeader('Content-Encoding', 'gzip');
      return res.send(masterDataGzip(data));
    }
    return data;
  }

  @Put('master-data')
  async saveCatalog(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_manage_master_data', 'crm_quick_add_master_option');
    let catalog: MasterCatalog;
    try {
      catalog = validateMasterCatalog(req.body.catalog);
    } catch (e: any) {
      throw new Problem(422, e.message);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('SELECT id FROM master_data WHERE id=1 FOR UPDATE');
      const previous = await masterData(conn, true);
      ensure(
        req.body.revision === previous.revision,
        'Master data telah berubah. Muat ulang lalu simpan kembali.',
        409,
      );
      for (const rows of Object.values(previous.catalog as Record<string, any[]>)) {
        const values = new Set((rows || []).map(x => x.value));
        for (const row of rows || [])
          ensure(
            values.has(row.value),
            'Data lama harus dipertahankan. Gunakan status tidak aktif untuk menonaktifkan pilihan.',
          );
      }
      await saveLocations(catalog, previous.catalog);
      await saveCustomerMasters(catalog);
      await saveBusinessMasters(catalog);
      await saveLegalMasters(catalog);
      await saveFinanceMasters(catalog);
      await saveEquipmentMasters(catalog);
      await saveDocumentMasters(catalog);
      await conn.query('UPDATE master_data SET catalog=?,revision=revision+1 WHERE id=1', [
        JSON.stringify(catalog),
      ]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    invalidateMasterData();
    return masterData(undefined, true);
  }

  @Public()
  @Get(['mandatory', 'master-mandatory'])
  mandatoryRules(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    return listMandatory();
  }

  @Put(['mandatory', 'master-mandatory'])
  async updateMandatoryRule(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_manage_master_data');
    const {id, section, fieldKey, field_key, mandatory} = req.body;
    const flag = mandatory === 1 || mandatory === true || mandatory === '1' ? 1 : 0;
    if (id !== undefined && id !== null) {
      await pool.execute('UPDATE master_mandatory SET mandatory=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [
        flag,
        id,
      ]);
    } else if (section && (fieldKey || field_key)) {
      await pool.execute(
        'UPDATE master_mandatory SET mandatory=?, updated_at=CURRENT_TIMESTAMP WHERE section=? AND field_key=?',
        [flag, section, fieldKey || field_key],
      );
    }
    return listMandatory();
  }

  @Public()
  @Get('wilayah/reverse-lookup')
  async reverseLookupWilayah(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const kel = clean(req.query.kelurahan),
      kec = clean(req.query.kecamatan),
      pos = clean(req.query.postalCode);
    const attempts: Array<[boolean, string, string[]]> = [
      [
        Boolean(kec && kel),
        `${VILLAGE_SELECT} WHERE REPLACE(UPPER(d.name),' ','')=? AND REPLACE(UPPER(v.name),' ','')=? LIMIT 1`,
        [kec, kel],
      ],
      [
        Boolean(pos && kec),
        `${VILLAGE_SELECT} WHERE v.postal_code=? AND REPLACE(UPPER(d.name),' ','')=? LIMIT 1`,
        [pos, kec],
      ],
      [Boolean(pos), `${VILLAGE_SELECT} WHERE v.postal_code=? LIMIT 1`, [pos]],
      [Boolean(kec), `${DISTRICT_SELECT} WHERE REPLACE(UPPER(d.name),' ','')=? LIMIT 1`, [kec]],
      [Boolean(kel), `${VILLAGE_SELECT} WHERE REPLACE(UPPER(v.name),' ','')=? LIMIT 1`, [kel]],
    ];
    for (const [enabled, sql, args] of attempts) {
      if (!enabled) continue;
      const [rows] = await pool.query<any[]>(sql, args);
      const row = rows[0];
      if (row) {
        return {
          found: true,
          province: row.province_name,
          provinceId: row.province_id,
          city: row.city_name,
          cityRegency: row.city_name,
          cityId: row.city_id,
          district: row.district_name,
          districtId: row.district_id,
          village: row.village_name,
          villageId: row.village_id,
          postalCode: row.postal_code,
        };
      }
    }
    return {found: false};
  }
}
