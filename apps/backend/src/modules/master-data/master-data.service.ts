import zlib from 'node:zlib';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {
  emptyMasterCatalog,
  validateMasterCatalog,
  validateMasterGroupItems,
  type MasterCatalog,
} from '@liugong/shared';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {Problem, ensure} from '../../core/domain';
import {BusinessMastersRepository} from './repositories/business-masters.repository';
import {CustomerMastersRepository} from './repositories/customer-masters.repository';
import {DocumentMastersRepository} from './repositories/document-masters.repository';
import {EquipmentMastersRepository} from './repositories/equipment-masters.repository';
import {FinanceMastersRepository} from './repositories/finance-masters.repository';
import {LegalMastersRepository} from './repositories/legal-masters.repository';
import {LocationRepository} from './repositories/location.repository';
import {WorkflowMastersRepository} from './repositories/workflow-masters.repository';
import {PreanalysisMastersRepository} from './repositories/preanalysis-masters.repository';

type Queryable = Pick<PoolConnection, 'query'>;
type CatalogData = {catalog: MasterCatalog; revision: number};

/** Every crm_ master table the catalog is built from; a change in any of them changes the revision. */
const REVISION_TABLES = [
  CRM.masterBranches,
  CRM.masterBusinessCategories,
  CRM.masterIndustrySegments,
  CRM.masterBusinessRoles,
  CRM.masterPicPositions,
  CRM.masterPremiseStatuses,
  CRM.masterCountries,
  CRM.masterProvinces,
  CRM.masterCities,
  CRM.masterDistricts,
  CRM.masterPostalCodes,
  CRM.masterVillages,
  CRM.masterFinancialInstitutions,
  CRM.masterProjectRoles,
  CRM.masterApplicationSources,
  CRM.masterEquipmentCategories,
  CRM.masterEquipmentBrands,
  CRM.masterEquipmentTypes,
  CRM.masterEquipmentModels,
  CRM.masterEquipmentAssets,
  CRM.masterFacilityPurposes,
  CRM.masterFinancingPurposeOptions,
  CRM.masterFinancingMethods,
  CRM.masterCurrencies,
  CRM.masterPaymentTimings,
  CRM.masterFapDocumentRequirements,
  CRM.masterLegalRemarkCategories,
  CRM.masterLegalRepresentativeTypes,
  CRM.masterLegalDesignations,
  CRM.masterStakeholderPositions,
  CRM.masterDocumentTypes,
  CRM.masterWorkflowStages,
  CRM.masterWorkflowStatuses,
  CRM.masterPreanalysisInvestmentOptions,
];

/** One master-data save at a time: a MySQL named lock held by one connection while the save runs. */
const SAVE_LOCK = 'crm_master_data_save';

const STALE = 'Master data telah berubah. Muat ulang lalu simpan kembali.';
const KEEP_OLD = 'Data lama harus dipertahankan. Gunakan status tidak aktif untuk menonaktifkan pilihan.';

/**
 * The master-data catalog: built from the crm_ master tables, cached in memory with its gzip form, and saved back
 * through the repository of each group.
 */
@Injectable()
export class MasterDataService {
  private cached: CatalogData | null = null;
  private cachedGzip: Buffer | null = null;

  constructor(
    private readonly db: CrmDatabase,
    private readonly location: LocationRepository,
    private readonly customer: CustomerMastersRepository,
    private readonly business: BusinessMastersRepository,
    private readonly legal: LegalMastersRepository,
    private readonly finance: FinanceMastersRepository,
    private readonly equipment: EquipmentMastersRepository,
    private readonly documents: DocumentMastersRepository,
    private readonly workflowMasters: WorkflowMastersRepository,
    private readonly preanalysis: PreanalysisMastersRepository,
  ) {}

  /**
   * The catalog revision, derived from the master tables themselves (row count and latest change of each table). Two
   * admins editing at the same time get "Master data telah berubah" instead of overwriting each other.
   */
  async revision(conn?: Queryable): Promise<number> {
    const sql = REVISION_TABLES.map(
      t => `SELECT COUNT(*) AS n, MAX(COALESCE(updated_at, created_at)) AS t FROM ${t}`,
    ).join(' UNION ALL ');
    const [rows] = await (conn || this.db.pool).query<any[]>(sql);
    const text = rows.map(r => `${r.n}|${r.t ? new Date(r.t).getTime() : 0}`).join(',');
    let hash = 0x811c9dc5; // FNV-1a, 32 bit
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
    return hash;
  }

  invalidate() {
    this.cached = null;
    this.cachedGzip = null;
  }

  gzip(data: unknown) {
    return (this.cachedGzip ??= zlib.gzipSync(Buffer.from(JSON.stringify(data), 'utf-8')));
  }

  /** The whole catalog. Served from memory unless `forceRefresh` or a connection (inside a save) is given. */
  async load(conn?: Queryable, forceRefresh = false): Promise<CatalogData> {
    if (this.cached && !forceRefresh && !conn) return this.cached;
    let catalog = await this.location.catalog(emptyMasterCatalog());
    catalog = await this.customer.catalog(catalog);
    catalog = await this.business.catalog(catalog);
    catalog = await this.legal.catalog(catalog);
    catalog = await this.finance.catalog(catalog);
    catalog = await this.equipment.catalog(catalog);
    catalog = await this.documents.catalog(catalog);
    catalog = await this.workflowMasters.catalog(catalog);
    catalog = await this.preanalysis.catalog(catalog);
    const result = {catalog, revision: await this.revision(conn)};
    if (!conn) this.cached = result;
    return result;
  }

  /** Saves the whole catalog (Master Data screen, "save all"). */
  async saveCatalog(input: unknown, revision: unknown, by: string | null): Promise<CatalogData> {
    let catalog: MasterCatalog;
    try {
      catalog = validateMasterCatalog(input);
    } catch (e: any) {
      throw new Problem(422, e.message);
    }
    await this.withSaveLock(async conn => {
      const previous = await this.load(conn, true);
      ensure(revision === previous.revision, STALE, 409);
      this.keepOldValues(previous.catalog, catalog, Object.keys(catalog));
      await this.location.save(catalog, previous.catalog, by);
      await this.customer.save(catalog, by);
      await this.business.save(catalog, by);
      await this.legal.save(catalog, by);
      await this.finance.save(catalog, by);
      await this.equipment.save(catalog, by);
      await this.documents.save(catalog, by);
      await this.preanalysis.save(catalog, by);
    });
    this.invalidate();
    return this.load(undefined, true);
  }

  /** Saves one group only (adding an option from a form, or one list in Master Data). */
  async saveGroup(group: string, rawItems: unknown[], revision: unknown, by: string | null): Promise<CatalogData> {
    let items;
    try {
      items = validateMasterGroupItems(group, rawItems);
    } catch (e: any) {
      throw new Problem(422, e.message);
    }
    await this.withSaveLock(async conn => {
      const previous = await this.load(conn, true);
      ensure(revision === previous.revision, STALE, 409);
      this.keepOldValues(previous.catalog, {[group]: items}, [group]);
      const catalog = {...previous.catalog, [group]: items} as MasterCatalog;
      if (LocationRepository.groups.includes(group)) await this.location.save(catalog, previous.catalog, by);
      else if (CustomerMastersRepository.groups.includes(group)) await this.customer.save(catalog, by);
      else if (BusinessMastersRepository.groups.includes(group)) await this.business.save(catalog, by);
      else if (LegalMastersRepository.groups.includes(group)) await this.legal.save(catalog, by);
      else if (FinanceMastersRepository.groups.includes(group)) await this.finance.save(catalog, by);
      else if (EquipmentMastersRepository.groups.includes(group)) await this.equipment.save(catalog, by);
      else if (DocumentMastersRepository.groups.includes(group)) await this.documents.save(catalog, by);
      else if (PreanalysisMastersRepository.groups.includes(group)) await this.preanalysis.save(catalog, by);
    });
    this.invalidate();
    return this.load(undefined, true);
  }

  private keepOldValues(previous: MasterCatalog, next: MasterCatalog, groups: string[]) {
    for (const group of groups) {
      const kept = new Set((next[group] || []).map(x => x.value));
      for (const row of previous[group] || []) ensure(kept.has(row.value), KEEP_OLD);
    }
  }

  private async withSaveLock<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
    const conn = await this.db.pool.getConnection();
    try {
      const [rows] = await conn.query<any[]>('SELECT GET_LOCK(?, 10) AS ok', [SAVE_LOCK]);
      ensure(Number(rows[0]?.ok) === 1, 'Master data sedang disimpan pengguna lain. Coba lagi.', 409);
      try {
        return await fn(conn);
      } finally {
        await conn.query('SELECT RELEASE_LOCK(?)', [SAVE_LOCK]);
      }
    } finally {
      conn.release();
    }
  }
}
