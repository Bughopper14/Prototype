import {validateMasterCatalog, validateMasterGroupItems, type MasterCatalog} from '@liugong/shared';
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
import {savePreanalysisMasters} from './repositories/preanalysis-masters.repository';
import {requireAuthority} from '../auth/session';

/* ---------- mandatory-field rules ---------- */

const MANDATORY_SQL = `
  SELECT
    r.id,
    CASE WHEN s.code = 'PRE_ANALYSIS' THEN 'PRE-AN' ELSE 'FAP' END AS stage,
    r.section_name AS section,
    r.field_key,
    r.field_label,
    r.is_mandatory AS mandatory
  FROM crm_master_field_mandatory_rules r
  JOIN crm_master_workflow_stages s ON s.id = r.stage_id
  WHERE r.is_active = 1
  ORDER BY stage, r.section_name, r.field_key`;

const listMandatory = async () => (await pool.query<any[]>(MANDATORY_SQL))[0];

let masterSaveQueue: Promise<unknown> = Promise.resolve();
const runExclusiveSave = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = masterSaveQueue.then(fn, fn);
  masterSaveQueue = next.catch(() => undefined);
  return next;
};

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
  async saveCatalog(@ApiReq() req: ApiRequest, @Res() _res: ApiResponse) {
    requireAuthority(req.actor, 'crm_manage_master_data', 'crm_quick_add_master_option');
    if (req.body.group && Array.isArray(req.body.items)) return this.saveGroup(req.body);
    let catalog: MasterCatalog;
    try {
      catalog = validateMasterCatalog(req.body.catalog);
    } catch (e: any) {
      throw new Problem(422, e.message);
    }

    return runExclusiveSave(async () => {
      const previous = await masterData(pool, true);
      if (req.body.revision !== undefined) {
        ensure(
          req.body.revision === previous.revision,
          'Master data telah berubah. Muat ulang lalu simpan kembali.',
          409,
        );
      }
      for (const rows of Object.values(previous.catalog as Record<string, any[]>)) {
        const values = new Set((rows || []).map(x => x.value));
        for (const row of rows || []) {
          ensure(
            values.has(row.value),
            'Data lama harus dipertahankan. Gunakan status tidak aktif untuk menonaktifkan pilihan.',
          );
        }
      }
      await saveLocations(catalog, previous.catalog);
      await saveCustomerMasters(catalog);
      await saveBusinessMasters(catalog);
      await saveLegalMasters(catalog);
      await saveFinanceMasters(catalog);
      await saveEquipmentMasters(catalog);
      await saveDocumentMasters(catalog);
      await savePreanalysisMasters(catalog);
      invalidateMasterData(true);
      return masterData(undefined, true);
    });
  }

  /** Saves one master group only (adding an option from a form, or one list in Master Data). */
  private async saveGroup(body: {group: string; items: unknown[]; revision?: number}) {
    const group = String(body.group);
    let items: any[];
    try {
      items = validateMasterGroupItems(group, body.items);
    } catch (e: any) {
      throw new Problem(422, e.message);
    }
    return runExclusiveSave(async () => {
      const previous = await masterData(pool, true);
      if (body.revision !== undefined) {
        ensure(
          body.revision === previous.revision,
          'Master data telah berubah. Muat ulang lalu simpan kembali.',
          409,
        );
      }
      const kept = new Set(items.map(x => x.value));
      for (const row of (previous.catalog as Record<string, any[]>)[group] || []) {
        ensure(
          kept.has(row.value),
          'Data lama harus dipertahankan. Gunakan status tidak aktif untuk menonaktifkan pilihan.',
        );
      }
      const catalog = {...previous.catalog, [group]: items} as MasterCatalog;
      if (['country', 'province', 'city', 'district', 'village', 'postalCode'].includes(group))
        await saveLocations(catalog, previous.catalog);
      else if (['branchCode', 'companyType', 'industrySegment', 'businessRole', 'position'].includes(group))
        await saveCustomerMasters(catalog);
      else if (['applicationSource', 'projectRole', 'bankOrFinInstitution'].includes(group))
        await saveBusinessMasters(catalog);
      else if (['remarkCategoryId', 'representativeType', 'designation'].includes(group))
        await saveLegalMasters(catalog);
      else if (['facilityPurpose', 'financingMethod', 'currency', 'paymentMethod'].includes(group))
        await saveFinanceMasters(catalog);
      else if (['unitCategory', 'brand', 'unitType', 'modelName', 'assetName'].includes(group))
        await saveEquipmentMasters(catalog);
      else if (group === 'documents') await saveDocumentMasters(catalog);
      else if (group === 'preanInvestmentPlanOptions') await savePreanalysisMasters(catalog, group);
      invalidateMasterData(true);
      return masterData(undefined, true);
    });
  }

  @Public()
  @Get('mandatory')
  mandatoryRules(@ApiReq() _req: ApiRequest, @Res() _res: ApiResponse) {
    return listMandatory();
  }

  @Put('mandatory')
  async updateMandatoryRule(@ApiReq() req: ApiRequest, @Res() _res: ApiResponse) {
    requireAuthority(req.actor, 'crm_manage_master_data');
    const {id, section, fieldKey, field_key, mandatory} = req.body;
    const flag = mandatory === 1 || mandatory === true || mandatory === '1' ? 1 : 0;
    const actor = req.actor?.name || req.actor?.username || null;
    if (id !== undefined && id !== null) {
      await pool.execute(
        'UPDATE crm_master_field_mandatory_rules SET is_mandatory=?, updated_at=CURRENT_TIMESTAMP(3), updated_by=? WHERE id=?',
        [flag, actor, id],
      );
    } else if (section && (fieldKey || field_key)) {
      await pool.execute(
        'UPDATE crm_master_field_mandatory_rules SET is_mandatory=?, updated_at=CURRENT_TIMESTAMP(3), updated_by=? WHERE section_name=? AND field_key=?',
        [flag, actor, section, fieldKey || field_key],
      );
    }
    return listMandatory();
  }
}
