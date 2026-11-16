import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';

type Db = Pick<PoolConnection, 'query'>;

/** Master tables whose rows the application forms refer to by code. */
export const CODE_MASTERS = {
  branch: CRM.masterBranches,
  businessCategory: CRM.masterBusinessCategories,
  premiseStatus: CRM.masterPremiseStatuses,
  industrySegment: CRM.masterIndustrySegments,
  businessRole: CRM.masterBusinessRoles,
  picPosition: CRM.masterPicPositions,
  country: CRM.masterCountries,
  financialInstitution: CRM.masterFinancialInstitutions,
  projectRole: CRM.masterProjectRoles,
  applicationSource: CRM.masterApplicationSources,
  facilityPurpose: CRM.masterFacilityPurposes,
  financingMethod: CRM.masterFinancingMethods,
  currency: CRM.masterCurrencies,
  paymentTiming: CRM.masterPaymentTimings,
  purposeOption: CRM.masterFinancingPurposeOptions,
  docRequirement: CRM.masterFapDocumentRequirements,
  unitCategory: CRM.masterEquipmentCategories,
  brand: CRM.masterEquipmentBrands,
  unitType: CRM.masterEquipmentTypes,
  model: CRM.masterEquipmentModels,
  asset: CRM.masterEquipmentAssets,
  remarkCategory: CRM.masterLegalRemarkCategories,
  representativeType: CRM.masterLegalRepresentativeTypes,
  stakeholderPosition: CRM.masterStakeholderPositions,
  designation: CRM.masterLegalDesignations,
} as const;
export type CodeMaster = keyof typeof CODE_MASTERS;

/**
 * Translates between the master codes the frontend works with (catalog values such as 'CORPORATE' or 'JKT01') and the
 * row ids the crm_ tables store. Provinces, cities, districts and villages already travel as ids; postal codes travel as
 * the code itself and are resolved within their city.
 */
@Injectable()
export class MasterIdLookup {
  constructor(private readonly db: CrmDatabase) {}

  async idOf(master: CodeMaster, code: unknown, db: Db = this.db.pool): Promise<string | null> {
    const value = String(code ?? '').trim();
    if (!value) return null;
    const [rows] = await db.query<any[]>(`SELECT id FROM ${CODE_MASTERS[master]} WHERE code=?`, [value]);
    if (!rows.length) throw Object.assign(new Error(`Unknown ${master} "${value}".`), {status: 422});
    return rows[0].id;
  }

  /** Like idOf, but free text that is not a master code gives null instead of an error. */
  async tryIdOf(master: CodeMaster, code: unknown, db: Db = this.db.pool): Promise<string | null> {
    const value = String(code ?? '').trim();
    if (!value) return null;
    const [rows] = await db.query<any[]>(`SELECT id FROM ${CODE_MASTERS[master]} WHERE code=?`, [value]);
    return rows[0]?.id ?? null;
  }

  async codeOf(master: CodeMaster, id: unknown, db: Db = this.db.pool): Promise<string | null> {
    if (!id) return null;
    const [rows] = await db.query<any[]>(`SELECT code FROM ${CODE_MASTERS[master]} WHERE id=?`, [id]);
    return rows[0]?.code ?? null;
  }

  /** All id → code pairs of one master (used to decode lists). */
  async codes(master: CodeMaster): Promise<Map<string, string>> {
    const [rows] = await this.db.pool.query<any[]>(`SELECT id,code FROM ${CODE_MASTERS[master]}`);
    return new Map(rows.map(r => [r.id, r.code]));
  }

  async postalCodeId(cityId: string | null, code: unknown, db: Db = this.db.pool): Promise<string | null> {
    const value = String(code ?? '').trim();
    if (!value || !cityId) return null;
    const [rows] = await db.query<any[]>(
      `SELECT id FROM ${CRM.masterPostalCodes} WHERE city_id=? AND postal_code=?`,
      [cityId, value],
    );
    if (!rows.length) throw Object.assign(new Error(`ZIP code ${value} is not available for this city.`), {status: 422});
    return rows[0].id;
  }

  /** Like postalCodeId, but a code that is not in the city (a foreign address) gives null. */
  async tryPostalCodeId(cityId: string | null, code: unknown, db: Db = this.db.pool): Promise<string | null> {
    const value = String(code ?? '').trim();
    if (!value || !cityId) return null;
    const [rows] = await db.query<any[]>(`SELECT id FROM ${CRM.masterPostalCodes} WHERE city_id=? AND postal_code=?`, [cityId, value]);
    return rows[0]?.id ?? null;
  }

  async postalCodeOf(id: unknown, db: Db = this.db.pool): Promise<string | null> {
    if (!id) return null;
    const [rows] = await db.query<any[]>(`SELECT postal_code FROM ${CRM.masterPostalCodes} WHERE id=?`, [id]);
    return rows[0]?.postal_code ?? null;
  }

  /**
   * Province → city → district → village ids from what a form sends: the master id, or (for instance from OCR) the
   * name. A name is looked up within its parent, so equal village names in other districts do not mix. Values that
   * match nothing are returned in `unresolved` (the caller decides: an error, or foreign address text).
   */
  async locationIds(
    input: {province?: unknown; city?: unknown; district?: unknown; village?: unknown},
    db: Db = this.db.pool,
  ) {
    const levels = [
      ['province', CRM.masterProvinces, null],
      ['city', CRM.masterCities, 'province_id'],
      ['district', CRM.masterDistricts, 'city_id'],
      ['village', CRM.masterVillages, 'district_id'],
    ] as const;
    const out: Record<'province' | 'city' | 'district' | 'village', string | null> = {
      province: null,
      city: null,
      district: null,
      village: null,
    };
    const unresolved: string[] = [];
    let parent: string | null = null;
    for (const [key, table, parentColumn] of levels) {
      const value = String(input[key] ?? '').trim();
      if (!value) {
        parent = null;
        continue;
      }
      const scope: string = parentColumn && parent ? ` AND ${parentColumn}=?` : '';
      const args: string[] = parentColumn && parent ? [parent] : [];
      let rows: any[] = (await db.query<any[]>(`SELECT id FROM ${table} WHERE id=?${scope}`, [value, ...args]))[0];
      if (!rows.length)
        rows = (await db.query<any[]>(`SELECT id FROM ${table} WHERE LOWER(name)=LOWER(?)${scope} LIMIT 1`, [
          value,
          ...args,
        ]))[0];
      out[key] = rows[0]?.id ?? null;
      if (!out[key]) unresolved.push(value);
      parent = out[key];
    }
    return {...out, unresolved};
  }

  /** The country of a province (profiles store country_id next to the province). */
  async countryOfProvince(provinceId: string | null, db: Db = this.db.pool): Promise<string | null> {
    if (!provinceId) return null;
    const [rows] = await db.query<any[]>(`SELECT country_id FROM ${CRM.masterProvinces} WHERE id=?`, [provinceId]);
    return rows[0]?.country_id ?? null;
  }
}
