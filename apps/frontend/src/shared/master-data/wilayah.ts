/**
 * Indonesian region (wilayah) name matching and upward lookup (village → district → city → province). The upward lookup
 * follows the parent id of each level (crm_master_* foreign keys) and fills the levels above with master ids.
 */
import {type MasterCatalog, type MasterItem} from '@liugong/shared';

export const cleanWilayahStr = (s: string) =>
  String(s || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

export function stripWilayahPrefix(str: string): string {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(
      /^(?:kabupaten\/kota|kota\/kabupaten|kabupaten|kab\b\.?|kota\s*administrasi|kota\s*adm\b\.?|kota|kot\b\.?|kodya\b\.?|kecamatan|kec\b\.?|desa\/kelurahan|kelurahan\/desa|kelurahan|kel\b\.?|desa|ds\b\.?|provinsi|propinsi|prov\b\.?|prop\b\.?)\s*/i,
      '',
    )
    .trim();
}

export function normalizeWilayahInput(str: string): string {
  if (!str) return '';
  const stripped = stripWilayahPrefix(str);
  return stripped.replace(/\b([a-zA-Z]+)\b/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export function matchWilayahName(masterName: string, input: string): boolean {
  if (!masterName || !input) return false;
  const cMaster = cleanWilayahStr(masterName);
  const cInput = cleanWilayahStr(input);
  if (cMaster === cInput) return true;

  const normInput = cleanWilayahStr(normalizeWilayahInput(input));
  const normMaster = cleanWilayahStr(normalizeWilayahInput(masterName));
  // both empty after the prefix is removed ("Kel." against a place called "Kota") is not a match
  if (normMaster && normInput && normMaster === normInput) return true;

  const coreInput = cleanWilayahStr(stripWilayahPrefix(input));
  const coreMaster = cleanWilayahStr(stripWilayahPrefix(masterName));
  if (coreInput && coreMaster && coreMaster === coreInput) {
    return true;
  }

  // "DKI Jakarta" is how documents write the province "Daerah Khusus Ibukota Jakarta". Only the province gets this shortcut:
  // any name that merely contains "jakarta" (Jakarta Selatan, Jakarta Baru) is a different place.
  if (cMaster === 'daerahkhususibukotajakarta' && (cInput.includes('dkijakarta') || cInput === 'jakarta')) return true;

  return false;
}

export const matchesMasterItem = (item: MasterItem, val: string) => {
  if (!item || !val) return false;
  if (item.value === val || item.name === val) return true;
  return matchWilayahName(item.name, val);
};

/**
 * Returns all matching parent IDs for a given administrative value.
 * For example, if 'Kota Cirebon' or 'Kabupaten Cirebon' or 'Cirebon' is selected/entered,
 * this returns the IDs of BOTH 'Kota Cirebon' and 'Kabupaten Cirebon' so that all children
 * (districts / subdistricts) are unified and accessible to the user without artificial splits.
 * Similarly unifies duplicate 'Desa' and 'Kelurahan' parent entries.
 */
export function getUnifiedParentIds(list: MasterItem[] | undefined, val: string | undefined): string[] {
  if (!list || !val) return [];
  const found = list.filter(item => matchesMasterItem(item, val));
  if (!found.length) return [val];

  // If matches were found by base name (e.g. Cirebon -> Kota Cirebon & Kabupaten Cirebon),
  // gather all IDs in the list that share the exact same core stripped name and province (if any).
  const coreTarget = cleanWilayahStr(stripWilayahPrefix(found[0].name || val));
  const unified = list.filter(item => {
    if (found.some(f => f.value === item.value)) return true;
    const coreItem = cleanWilayahStr(stripWilayahPrefix(item.name));
    if (coreTarget && coreItem === coreTarget) {
      // If parents have a parentValue (e.g. province), check that they belong to the same province
      if (found[0].parentValue && item.parentValue && found[0].parentValue !== item.parentValue) {
        return false;
      }
      return true;
    }
    return false;
  });

  return Array.from(new Set(unified.map(x => x.value)));
}

export function resolveWilayahUpwards(record: any, data: MasterCatalog) {
  if (!data || !record) return record;
  const next = {...record};
  const vList = data.village || [];
  const dList = data.district || [];
  const cList = data.city || [];
  const pList = data.province || [];

  const rawVill = next.village;
  const rawDist = next.district;
  const rawCity = next.city || next.cityRegency;
  const rawProv = next.province;
  const rawZip = next.postalCode;

  // 1. Try finding village
  let villageItem: MasterItem | undefined;
  if (rawVill) {
    villageItem = vList.find(x => matchesMasterItem(x, rawVill));
  }
  if (!villageItem && rawZip) {
    villageItem = vList.find(x => x.zipCode === String(rawZip).trim());
  }

  // 2. Try finding district
  let districtItem: MasterItem | undefined;
  if (villageItem?.parentValue) {
    districtItem = dList.find(x => x.value === villageItem!.parentValue);
  }
  if (!districtItem && rawDist) {
    districtItem = dList.find(x => matchesMasterItem(x, rawDist));
  }

  // 3. Try finding city
  let cityItem: MasterItem | undefined;
  if (districtItem?.parentValue) {
    cityItem = cList.find(x => x.value === districtItem!.parentValue);
  }
  if (!cityItem && rawCity) {
    cityItem = cList.find(x => matchesMasterItem(x, rawCity));
  }

  // 4. Try finding province
  let provItem: MasterItem | undefined;
  if (cityItem?.parentValue) {
    provItem = pList.find(x => x.value === cityItem!.parentValue);
  }
  if (!provItem && rawProv) {
    provItem = pList.find(x => matchesMasterItem(x, rawProv));
  }

  // Fill the levels above from the parent ids. When the city was found through the district / village that was just
  // chosen (its parent id), that city and its province win over a different value already in the record (e.g. adjusting Kota vs Kabupaten).
  const cityFromChild = !!districtItem?.parentValue;
  const differs = (item: MasterItem, current: unknown) => {
    if (!current) return true;
    if (item.value === current || item.name === current) return false;
    return true;
  };
  if (provItem && (!next.province || (cityFromChild && differs(provItem, next.province)))) {
    next.province = provItem.value;
  }
  if (cityItem && (!(next.city || next.cityRegency) || (cityFromChild && differs(cityItem, next.city || next.cityRegency)))) {
    next.cityRegency = cityItem.value;
    next.city = cityItem.value;
  }
  if (
    districtItem &&
    (!next.district ||
      next.district === '' ||
      cleanWilayahStr(next.district) === cleanWilayahStr(districtItem.name) ||
      next.district === districtItem.value)
  ) {
    next.district = districtItem.value;
  }
  if (
    villageItem &&
    (!next.village ||
      next.village === '' ||
      cleanWilayahStr(next.village) === cleanWilayahStr(villageItem.name) ||
      next.village === villageItem.value)
  ) {
    next.village = villageItem.value;
    if (!next.postalCode && villageItem.zipCode) {
      next.postalCode = villageItem.zipCode;
    }
  }

  return next;
}
