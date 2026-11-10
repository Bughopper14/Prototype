/** Master-data catalog shared by every form: in-memory store, React hook and save. */
import {api} from '@/shared/lib/api';
import {
  defaultMasterCatalog,
  validateMasterCatalog,
  validateMasterGroupItems,
  type MasterCatalog,
} from '@liugong/shared';
import {useEffect, useState} from 'react';

export const equipmentChildren = new Set(['brand', 'unitType', 'modelName', 'assetName']);
export const locationGroups = new Set(['province', 'city', 'district', 'village']);

let catalog = defaultMasterCatalog(),
  revision = 0;
export function setMasterData(data: {catalog: MasterCatalog; revision: number}) {
  const def = defaultMasterCatalog();
  const next = {...def, ...data.catalog};
  for (const k of ['district', 'village', 'postalCode'] as const) {
    if (!next[k] || next[k].length === 0) {
      next[k] = def[k];
    }
  }
  catalog = next;
  revision = data.revision;
  window.dispatchEvent(new Event('master-data-updated'));
}
export function useMasterData() {
  const [data, setData] = useState(catalog);
  useEffect(() => {
    const update = () => setData(catalog);
    window.addEventListener('master-data-updated', update);
    return () => window.removeEventListener('master-data-updated', update);
  }, []);
  return data;
}

/** Saves the catalog; with `groupKey` only that list is sent and stored (much faster than the whole catalog). */
export async function saveCatalog(next: MasterCatalog, groupKey?: string) {
  if (groupKey && next[groupKey]) {
    validateMasterGroupItems(groupKey, next[groupKey]);
    const result = await api('/master-data', 'PUT', {group: groupKey, items: next[groupKey], revision});
    setMasterData(result);
    return result;
  }
  validateMasterCatalog(next);
  const result = await api('/master-data', 'PUT', {catalog: next, revision});
  setMasterData(result);
  return result;
}
