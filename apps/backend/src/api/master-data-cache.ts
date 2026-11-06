import zlib from 'node:zlib';
import type {PoolConnection} from 'mysql2/promise';
import {pool} from '../db/pool';
import {defaultMasterCatalog, type MasterCatalog} from '@liugong/shared';
import {locationCatalog} from '../db/repositories/location';
import {customerMasterCatalog} from '../db/repositories/customer-masters';
import {businessMasterCatalog} from '../db/repositories/business-masters';
import {legalMasterCatalog} from '../db/repositories/legal-masters';
import {financeMasterCatalog} from '../db/repositories/finance-masters';
import {equipmentMasterCatalog} from '../db/repositories/equipment-masters';
import {documentMasterCatalog} from '../db/repositories/document-masters';

/** The merged master-data catalog (about 15 MB of JSON), cached in memory together with its gzip form. */

let cachedCatalog: {catalog: any; revision: number} | null = null;
let cachedGzip: Buffer | null = null;

type Queryable = Pick<PoolConnection, 'query'>;

export function invalidateMasterData() {
  cachedCatalog = null;
  cachedGzip = null;
}

export const masterDataGzip = (data: unknown) =>
  (cachedGzip ??= zlib.gzipSync(Buffer.from(JSON.stringify(data), 'utf-8')));

export async function masterData(conn?: Queryable, forceRefresh = false) {
  if (cachedCatalog && !forceRefresh && !conn) return cachedCatalog;

  const [rows] = await (conn || pool).query<any[]>('SELECT catalog, revision FROM master_data WHERE id = 1');
  const raw = rows[0]?.catalog;
  const stored = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
  const defaults = defaultMasterCatalog();
  const merged: any = {...defaults, ...stored};

  // Location lists always include the built-in entries, even when a saved catalog predates them.
  for (const key of ['district', 'village', 'postalCode'] as const) {
    merged[key] = merged[key] || [];
    const seen = new Set(merged[key].map((item: any) => item.value));
    for (const item of (defaults as any)[key] || []) {
      if (!seen.has(item.value)) {
        merged[key].push(item);
        seen.add(item.value);
      }
    }
  }

  let catalog = await locationCatalog(merged as MasterCatalog);
  catalog = await customerMasterCatalog(catalog);
  catalog = await businessMasterCatalog(catalog);
  catalog = await legalMasterCatalog(catalog);
  catalog = await financeMasterCatalog(catalog);
  catalog = await equipmentMasterCatalog(catalog);
  catalog = await documentMasterCatalog(catalog);

  const result = {catalog, revision: rows[0]?.revision || 0};
  if (!conn) cachedCatalog = result;
  return result;
}
