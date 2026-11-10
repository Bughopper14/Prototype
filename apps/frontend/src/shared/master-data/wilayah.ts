/** Indonesian region (wilayah) name matching and upward lookup (village → district → city → province). */
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
      /^(?:kabupaten\b|kab\b\.?|kota\s*administrasi\b|kota\s*adm\b\.?|kota\b|kot\b\.?|kodya\b\.?|kecamatan\b|kec\b\.?|desa\/kelurahan\b|kelurahan\/desa\b|kelurahan\b|kel\b\.?|desa\b|ds\b\.?|provinsi\b|propinsi\b|prov\b\.?|prop\b\.?)\s*/i,
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
  if (normMaster && normInput && normMaster === normInput) return true;

  const coreInput = cleanWilayahStr(stripWilayahPrefix(input));
  const coreMaster = cleanWilayahStr(stripWilayahPrefix(masterName));
  if (coreInput && coreMaster) {
    if (coreMaster === coreInput) return true;
  }

  // Handle DKI Jakarta
  if (
    (cInput.includes('dkijakarta') || cInput.includes('jakarta')) &&
    (cMaster.includes('jakarta') || cMaster.includes('daerahkhususibukotajakarta'))
  )
    return true;

  return false;
}

export const matchesMasterItem = (item: MasterItem, val: string) => {
  if (!item || !val) return false;
  if (item.value === val || item.name === val) return true;
  return matchWilayahName(item.name, val);
};

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

  // Auto-populate upward hierarchy if missing
  if (provItem && (!next.province || next.province === '')) {
    next.province = provItem.name;
  }
  if (cityItem && (!next.cityRegency || next.cityRegency === '')) {
    next.cityRegency = cityItem.name;
    next.city = cityItem.name;
  }
  if (
    districtItem &&
    (!next.district ||
      next.district === '' ||
      cleanWilayahStr(next.district) === cleanWilayahStr(districtItem.name) ||
      next.district === districtItem.value)
  ) {
    next.district = districtItem.name;
  }
  if (
    villageItem &&
    (!next.village ||
      next.village === '' ||
      cleanWilayahStr(next.village) === cleanWilayahStr(villageItem.name) ||
      next.village === villageItem.value)
  ) {
    next.village = villageItem.name;
    if (!next.postalCode && villageItem.zipCode) {
      next.postalCode = villageItem.zipCode;
    }
  }

  return next;
}
