import {gzipSync} from 'node:zlib';
import type {MasterCatalog} from '@liugong/shared';
import {clearCrmLookupCache} from '../../core/db/crm-lookups';
import {businessMasterCatalog} from './repositories/business-masters.repository';
import {customerMasterCatalog} from './repositories/customer-masters.repository';
import {documentMasterCatalog} from './repositories/document-masters.repository';
import {equipmentMasterCatalog} from './repositories/equipment-masters.repository';
import {financeMasterCatalog} from './repositories/finance-masters.repository';
import {legalMasterCatalog} from './repositories/legal-masters.repository';
import {locationCatalog} from './repositories/location.repository';
import {preanalysisMasterCatalog} from './repositories/preanalysis-masters.repository';

export type Queryable = any;

export interface MasterDataPayload {
  catalog: MasterCatalog;
  revision: number;
}

let cachedData: MasterDataPayload | null = null;
let cachedGzip: Buffer | null = null;
let currentRevision = 1;
let inFlight: Promise<MasterDataPayload> | null = null;

export function invalidateMasterData(bumpRevision = false) {
  if (bumpRevision) currentRevision += 1;
  cachedData = null;
  cachedGzip = null;
  clearCrmLookupCache();
}

export const masterDataGzip = (data: unknown) => {
  if (data === cachedData && cachedGzip) return cachedGzip;
  return gzipSync(JSON.stringify(data));
};

export async function masterData(_conn?: Queryable, forceRefresh = false): Promise<MasterDataPayload> {
  if (cachedData && !forceRefresh) return cachedData;
  if (inFlight && !forceRefresh) return inFlight;

  inFlight = (async () => {
    const empty: MasterCatalog = {};
    const [cust, loc, biz, eq, fin, leg, doc, pa] = await Promise.all([
      customerMasterCatalog(empty),
      locationCatalog(empty),
      businessMasterCatalog(empty),
      equipmentMasterCatalog(empty),
      financeMasterCatalog(empty),
      legalMasterCatalog(empty),
      documentMasterCatalog(empty),
      preanalysisMasterCatalog(empty),
    ]);
    const merged: MasterCatalog = {
      ...cust,
      ...loc,
      ...biz,
      ...eq,
      ...fin,
      ...leg,
      ...doc,
      ...pa,
    };
    const payload: MasterDataPayload = {catalog: merged, revision: currentRevision};
    cachedData = payload;
    cachedGzip = gzipSync(JSON.stringify(payload));
    return payload;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
