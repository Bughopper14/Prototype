/** Pulls province / city / district / village out of the NIB address text. */
import {cleanWilayahStr, matchWilayahName, normalizeWilayahInput} from '@/shared/master-data';
import {defaultMasterCatalog, type MasterCatalog} from '@liugong/shared';

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

  const fullText = `${alamat || ''}\n${rawText || ''}`;

  // 1. Extract RT / RW if explicitly present
  const rtRwMatch = fullText.match(
    /(?:RT|R\.T)\.?\s*[:.]?\s*(\d{1,3})\s*(?:[\/-]|\s*dan\s*|\s*,?\s*)\s*(?:RW|R\.W)\.?\s*[:.]?\s*(\d{1,3})/i,
  );
  if (rtRwMatch) {
    result.rt = rtRwMatch[1].padStart(3, '0').slice(-3);
    result.rw = rtRwMatch[2].padStart(3, '0').slice(-3);
  } else {
    const rtOnly = fullText.match(/\bRT\s*[:.]?\s*(\d{1,3})\b/i);
    if (rtOnly) result.rt = rtOnly[1].padStart(3, '0').slice(-3);
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

  // 3. Extract Explicit Labeled Administrative Fields from fullText (evaluates alamat & rawText)
  // Province (e.g. "Provinsi Jawa Barat, Kode Pos: 45155" or "Prov. DKI Jakarta")
  const provExplicit = fullText.match(
    /(?:provinsi|propinsi|prov\.|prov\b|prop\.|prop\b)\s*[:.]?\s*([a-zA-Z\s]{3,35}?)(?:,\s*kode\s*pos|,\s*\d{5}|[\n\r,;]|$)/i,
  );
  if (provExplicit && provExplicit[1].trim()) {
    result.province = normalizeWilayahInput(provExplicit[1].trim());
  }

  // City / Regency (e.g. "Kab. Cirebon", "Kota Cirebon", "Kot. Cirebon", "Kabupaten Bandung", "Kota Administrasi Jakarta Selatan")
  const cityExplicit = fullText.match(
    /(?:kabupaten\/kota|kota\/kabupaten|kabupaten|kota\s*adm(?:inistrasi)?\.?|kota|kot\.|kot\b|kodya\b\.?|kab\.|kab\b)\s*[:.]?\s*([a-zA-Z\s]{3,35}?)(?:,\s*prov|\bprovinsi|\bpropinsi|\bprov\.|,\s*kode\s*pos|[\n\r,;]|$)/i,
  );
  if (cityExplicit && cityExplicit[1].trim()) {
    result.city = normalizeWilayahInput(cityExplicit[1].trim());
  }

  // District (e.g. "Kec. Depok", "Kecamatan Setiabudi")
  const distExplicit = fullText.match(
    /(?:kecamatan|kec\.|kec\b)\s*[:.]?\s*([a-zA-Z\s]{3,35}?)(?:,\s*kab|,\s*kota|,\s*kot|\bkab\.|\bkabupaten|\bkota|\bkot|\bprov|[\n\r,;]|$)/i,
  );
  if (distExplicit && distExplicit[1].trim()) {
    result.district = normalizeWilayahInput(distExplicit[1].trim());
  }

  // Village (e.g. "Desa/Kelurahan Kasugengan Kidul", "Kel. Karet Semanggi", "Desa Sukamaju")
  const villExplicit = fullText.match(
    /(?:desa\/kelurahan|kelurahan\/desa|kelurahan|desa|kel\.|kel\b|ds\.|ds\b)\s*[:.]?\s*([a-zA-Z\s]{3,35}?)(?:,\s*kec|\bkec\.|\bkecamatan|\bkab|[\n\r,;]|$)/i,
  );
  if (villExplicit && villExplicit[1].trim()) {
    result.village = normalizeWilayahInput(villExplicit[1].trim());
  }

  // 4. Tokenize alamat by delimiter for fallback searches
  const parts = String(alamat || '')
    .split(/[,;\n\r]+/)
    .map(p => p.trim())
    .filter(Boolean);

  // 5. Match or Standardize Province
  if (result.province) {
    const pFound = pList.find(p => matchWilayahName(p.name, result.province!));
    if (pFound) result.province = normalizeWilayahInput(pFound.name);
  } else {
    for (const part of [...parts].reverse()) {
      const match = pList.find(p => matchWilayahName(p.name, part));
      if (match) {
        result.province = normalizeWilayahInput(match.name);
        break;
      }
    }
  }

  // 6. Match or Standardize City
  if (result.city) {
    const cFound = cList.find(c => matchWilayahName(c.name, result.city!));
    if (cFound) {
      result.city = normalizeWilayahInput(cFound.name);
    }
  } else {
    for (const part of [...parts].reverse()) {
      const match = cList.find(c => matchWilayahName(c.name, part));
      if (match) {
        result.city = normalizeWilayahInput(match.name);
        break;
      }
    }
  }

  // 7. Match or Standardize District
  if (result.district) {
    const dFound = dList.find(d => matchWilayahName(d.name, result.district!));
    if (dFound) result.district = normalizeWilayahInput(dFound.name);
  } else {
    for (const part of [...parts].reverse()) {
      const match = dList.find(d => matchWilayahName(d.name, part));
      if (match) {
        result.district = normalizeWilayahInput(match.name);
        break;
      }
    }
  }

  // 8. Match or Standardize Village
  if (result.village) {
    const vFound = vList.find(v => matchWilayahName(v.name, result.village!));
    if (vFound) {
      result.village = normalizeWilayahInput(vFound.name);
      if (!result.postalCode && vFound.zipCode) result.postalCode = vFound.zipCode;
    }
  } else {
    for (const part of [...parts].reverse()) {
      const match = vList.find(v => matchWilayahName(v.name, part));
      if (match) {
        result.village = normalizeWilayahInput(match.name);
        if (!result.postalCode && match.zipCode) result.postalCode = match.zipCode;
        break;
      }
    }
  }

  // 9. If postal code matches a village in catalog and village/district/city are not set, backfill only unset fields
  if (result.postalCode) {
    const vByZip = vList.find(v => v.zipCode === result.postalCode);
    if (vByZip) {
      if (!result.village) result.village = normalizeWilayahInput(vByZip.name);
      if (!result.district && vByZip.parentValue) {
        const dByZip = dList.find(
          d =>
            cleanWilayahStr(d.value) === cleanWilayahStr(vByZip.parentValue!) ||
            matchWilayahName(d.name, vByZip.parentValue!),
        );
        if (dByZip) {
          result.district = normalizeWilayahInput(dByZip.name);
          if (!result.city && dByZip.parentValue) {
            const cByZip = cList.find(
              c =>
                cleanWilayahStr(c.value) === cleanWilayahStr(dByZip.parentValue!) ||
                matchWilayahName(c.name, dByZip.parentValue!),
            );
            if (cByZip) {
              result.city = normalizeWilayahInput(cByZip.name);
              if (!result.province && cByZip.parentValue) {
                const pByZip = pList.find(
                  p =>
                    cleanWilayahStr(p.value) === cleanWilayahStr(cByZip.parentValue!) ||
                    matchWilayahName(p.name, cByZip.parentValue!),
                );
                if (pByZip) result.province = normalizeWilayahInput(pByZip.name);
              }
            }
          }
        }
      }
    }
  }

  // 10. If postalCode still not set, look up by village or district
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

  if (result.province) result.province = normalizeWilayahInput(result.province);
  if (result.city) result.city = normalizeWilayahInput(result.city);
  if (result.district) result.district = normalizeWilayahInput(result.district);
  if (result.village) result.village = normalizeWilayahInput(result.village);

  return result;
}
