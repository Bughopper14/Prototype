/** Pulls province / city / district / village out of the NIB address text. */
import {
  cleanWilayahStr,
  matchWilayahName,
  normalizeWilayahInput,
  stripWilayahPrefix,
} from '@/shared/master-data';
import {defaultMasterCatalog, type MasterCatalog, type MasterItem} from '@liugong/shared';

export function extractWilayahFromAddressAndText(rawText: string, alamat: string, catalog?: MasterCatalog) {
  const master = catalog || defaultMasterCatalog();
  const vList = master.village || [];
  const dList = master.district || [];
  const cList = master.city || [];
  const pList = master.province || [];
  const postList = master.postalCode || [];

  const result: {
    province?: string;
    city?: string;
    district?: string;
    village?: string;
    postalCode?: string;
    rt?: string;
    rw?: string;
  } = {};

  const fullText = `${rawText || ''}\n${alamat || ''}`;

  // 1. Extract RT / RW if present
  const rtRwMatch =
    fullText.match(
      /(?:RT|R\.T)\.?\s*[:.]?\s*(\d{1,3})\s*(?:[\/-]|\s*dan\s*|\s*,?\s*)\s*(?:RW|R\.W)\.?\s*[:.]?\s*(\d{1,3})/i,
    ) || fullText.match(/\bRT\s*[:.]?\s*(\d{1,3})\b/i);
  if (rtRwMatch) {
    if (rtRwMatch[2]) {
      result.rt = rtRwMatch[1].padStart(3, '0').slice(-3);
      result.rw = rtRwMatch[2].padStart(3, '0').slice(-3);
    } else {
      result.rt = rtRwMatch[1].padStart(3, '0').slice(-3);
    }
  }
  if (!result.rw) {
    const rwOnly = fullText.match(/\bRW\s*[:.]?\s*(\d{1,3})\b/i);
    if (rwOnly) result.rw = rwOnly[1].padStart(3, '0').slice(-3);
  }

  // 2. Extract Postal Code
  const postalMatch =
    fullText.match(/(?:kode\s*pos|pos|zip(?:\s*code)?)\s*[:.]?\s*(\d{5})\b/i) ||
    (alamat && alamat.match(/\b(\d{5})\b/)) ||
    fullText.match(/\b(\d{5})\b/);
  if (postalMatch) {
    result.postalCode = postalMatch[1];
  }

  // 3. Extract explicit labeled fields in rawText if any:
  const provExplicit = rawText.match(
    /(?:provinsi|propinsi|prov\.?)\s*[:.]?\s*([a-zA-Z\s]{3,35})(?:[\n\r,]|$)/i,
  );
  if (provExplicit) result.province = normalizeWilayahInput(provExplicit[1].trim());

  const cityExplicit = rawText.match(
    /(?:kabupaten\/kota|kabupaten|kota\s*adm\.?|kota|kab\.?)\s*[:.]?\s*([a-zA-Z\s]{3,35})(?:[\n\r,]|$)/i,
  );
  if (cityExplicit) result.city = normalizeWilayahInput(cityExplicit[1].trim());

  const distExplicit = rawText.match(/(?:kecamatan|kec\.?)\s*[:.]?\s*([a-zA-Z\s]{3,35})(?:[\n\r,]|$)/i);
  if (distExplicit) result.district = normalizeWilayahInput(distExplicit[1].trim());

  const villExplicit = rawText.match(
    /(?:kelurahan\/desa|desa\/kelurahan|kelurahan|desa|kel\.?)\s*[:.]?\s*([a-zA-Z\s]{3,35})(?:[\n\r,]|$)/i,
  );
  if (villExplicit) result.village = normalizeWilayahInput(villExplicit[1].trim());

  // 4. Tokenize alamat by comma / semicolon / newline
  const parts = String(alamat || '')
    .split(/[,;\n\r]+/)
    .map(p => p.trim())
    .filter(Boolean);

  // 5. Match Village:
  let foundVillageItem = vList.find(v => {
    if (result.village && matchWilayahName(v.name, result.village)) return true;
    return false;
  });

  if (!foundVillageItem) {
    for (const part of [...parts].reverse()) {
      const match = vList.find(v => matchWilayahName(v.name, part));
      if (match) {
        foundVillageItem = match;
        break;
      }
    }
  }

  if (!foundVillageItem && (alamat || rawText)) {
    const cAlamat = cleanWilayahStr(`${alamat} ${rawText}`);
    const sortedVillages = [...vList].sort((a, b) => b.name.length - a.name.length);
    for (const v of sortedVillages) {
      const core = cleanWilayahStr(stripWilayahPrefix(v.name));
      if (core.length >= 4 && cAlamat.includes(core)) {
        foundVillageItem = v;
        break;
      }
    }
  }

  if (!foundVillageItem && result.postalCode) {
    foundVillageItem = vList.find(v => v.zipCode === result.postalCode);
  }

  if (foundVillageItem) {
    result.village = foundVillageItem.name;
    if (!result.postalCode && foundVillageItem.zipCode) {
      result.postalCode = foundVillageItem.zipCode;
    }
  } else if (result.village) {
    result.village = normalizeWilayahInput(result.village);
  }

  // 6. Match District:
  let foundDistrictItem: MasterItem | undefined;
  if (result.district) {
    foundDistrictItem = dList.find(d => matchWilayahName(d.name, result.district!));
  }
  if (!foundDistrictItem && foundVillageItem?.parentValue) {
    foundDistrictItem = dList.find(
      d =>
        cleanWilayahStr(d.value) === cleanWilayahStr(foundVillageItem!.parentValue!) ||
        matchWilayahName(d.name, foundVillageItem!.parentValue!),
    );
  }

  if (!foundDistrictItem) {
    for (const part of [...parts].reverse()) {
      const match = dList.find(d => matchWilayahName(d.name, part));
      if (match) {
        foundDistrictItem = match;
        break;
      }
    }
  }

  if (!foundDistrictItem && (alamat || rawText)) {
    const cAlamat = cleanWilayahStr(`${alamat} ${rawText}`);
    const sortedDistricts = [...dList].sort((a, b) => b.name.length - a.name.length);
    for (const d of sortedDistricts) {
      const core = cleanWilayahStr(stripWilayahPrefix(d.name));
      if (core.length >= 4 && cAlamat.includes(core)) {
        foundDistrictItem = d;
        break;
      }
    }
  }

  if (foundDistrictItem) {
    result.district = foundDistrictItem.name;
  } else if (result.district) {
    result.district = normalizeWilayahInput(result.district);
  }

  // 7. Match City / Regency:
  let foundCityItem: MasterItem | undefined;
  if (result.city) {
    foundCityItem = cList.find(c => matchWilayahName(c.name, result.city!));
  }
  if (!foundCityItem && foundDistrictItem?.parentValue) {
    foundCityItem = cList.find(
      c =>
        cleanWilayahStr(c.value) === cleanWilayahStr(foundDistrictItem!.parentValue!) ||
        matchWilayahName(c.name, foundDistrictItem!.parentValue!),
    );
  }

  if (!foundCityItem) {
    for (const part of [...parts].reverse()) {
      const match = cList.find(c => matchWilayahName(c.name, part));
      if (match) {
        foundCityItem = match;
        break;
      }
    }
  }

  if (!foundCityItem && (alamat || rawText)) {
    const cAlamat = cleanWilayahStr(`${alamat} ${rawText}`);
    const sortedCities = [...cList].sort((a, b) => b.name.length - a.name.length);
    for (const c of sortedCities) {
      const core = cleanWilayahStr(stripWilayahPrefix(c.name));
      if (core.length >= 4 && cAlamat.includes(core)) {
        foundCityItem = c;
        break;
      }
    }
  }

  if (foundCityItem) {
    result.city = foundCityItem.name;
  } else if (result.city) {
    result.city = normalizeWilayahInput(result.city);
  }

  // 8. Match Province:
  let foundProvItem: MasterItem | undefined;
  if (result.province) {
    foundProvItem = pList.find(p => matchWilayahName(p.name, result.province!));
  }
  if (!foundProvItem && foundCityItem?.parentValue) {
    foundProvItem = pList.find(
      p =>
        cleanWilayahStr(p.value) === cleanWilayahStr(foundCityItem!.parentValue!) ||
        matchWilayahName(p.name, foundCityItem!.parentValue!),
    );
  }

  if (!foundProvItem) {
    for (const part of [...parts].reverse()) {
      const match = pList.find(p => matchWilayahName(p.name, part));
      if (match) {
        foundProvItem = match;
        break;
      }
    }
  }

  if (!foundProvItem && fullText) {
    const cFull = cleanWilayahStr(fullText);
    for (const p of pList) {
      const core = cleanWilayahStr(stripWilayahPrefix(p.name));
      if (
        core.length >= 4 &&
        (cFull.includes(core) || (core.includes('jakarta') && cFull.includes('jakarta')))
      ) {
        foundProvItem = p;
        break;
      }
    }
  }

  if (foundProvItem) {
    result.province = foundProvItem.name;
  } else if (result.province) {
    result.province = normalizeWilayahInput(result.province);
  }

  // 9. If postalCode still not set, look up by village or district
  if (!result.postalCode && (result.village || result.district)) {
    const candidate = postList.find(po => {
      const cName = cleanWilayahStr(po.name);
      if (result.village && cName.includes(cleanWilayahStr(result.village))) return true;
      if (result.district && cName.includes(cleanWilayahStr(result.district))) return true;
      return false;
    });
    if (candidate) {
      result.postalCode = candidate.value;
    }
  }

  return result;
}
