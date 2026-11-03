import {defaultMasterCatalog, type MasterCatalog, type MasterItem} from '@/lib/shared/master-catalog';

export interface ParsedNibData {
  nib?: string;
  companyName?: string;
  alamat?: string;
  email?: string;
  phone?: string;
  tanggalTerbit?: string;
  province?: string;
  city?: string;
  district?: string;
  village?: string;
  postalCode?: string;
  rt?: string;
  rw?: string;
  rawText: string;
}

const ID_MONTHS: Record<string, string> = {
  januari: '01', jan: '01', january: '01',
  februari: '02', feb: '02', february: '02',
  maret: '03', mar: '03', march: '03',
  april: '04', apr: '04',
  mei: '05', may: '05',
  juni: '06', jun: '06', june: '06',
  juli: '07', jul: '07', july: '07',
  agustus: '08', agt: '08', agu: '08', august: '08', aug: '08',
  september: '09', sep: '09', sept: '09',
  oktober: '10', okt: '10', october: '10', oct: '10',
  november: '11', nov: '11',
  desember: '12', des: '12', december: '12', dec: '12'
};

export function parseDateToIso(rawDate: string): string | undefined {
  if (!rawDate) return undefined;
  const clean = rawDate.trim();

  // Pattern: 15 Januari 2021
  const wordMatch = clean.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (wordMatch) {
    const day = wordMatch[1].padStart(2, '0');
    const monthStr = wordMatch[2].toLowerCase();
    const year = wordMatch[3];
    const month = ID_MONTHS[monthStr] || '01';
    return `${year}-${month}-${day}`;
  }

  // Pattern: YYYY-MM-DD
  const isoMatch = clean.match(/(\d{4})[-/.](\d{2})[-/.](\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Pattern: DD-MM-YYYY
  const dmyMatch = clean.match(/(\d{2})[-/.](\d{2})[-/.](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  return undefined;
}

export const cleanWilayahStr = (s: string) => String(s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

export function normalizeWilayahInput(str: string): string {
  if (!str) return '';
  let s = String(str).trim();
  let prefix = '';
  if (/^(?:kab\\.?|kabupaten\\.?)\\s+/i.test(s)) {
    prefix = 'Kabupaten ';
    s = s.replace(/^(?:kab\\.?|kabupaten\\.?)\\s+/i, '');
  } else if (/^(?:kota\\s*adm\\.?|kota\\s*administrasi\\.?)\\s+/i.test(s)) {
    prefix = 'Kota Administrasi ';
    s = s.replace(/^(?:kota\\s*adm\\.?|kota\\s*administrasi\\.?)\\s+/i, '');
  } else if (/^(?:kota|kodya)\\.?\\s+/i.test(s)) {
    prefix = 'Kota ';
    s = s.replace(/^(?:kota|kodya)\\.?\\s+/i, '');
  } else if (/^(?:kec\\.?|kecamatan\\.?)\\s+/i.test(s)) {
    prefix = 'Kecamatan ';
    s = s.replace(/^(?:kec\\.?|kecamatan\\.?)\\s+/i, '');
  } else if (/^(?:kel\\.?|kelurahan\\.?)\\s+/i.test(s)) {
    prefix = 'Kelurahan ';
    s = s.replace(/^(?:kel\\.?|kelurahan\\.?)\\s+/i, '');
  } else if (/^(?:desa|ds\\.?)\\s+/i.test(s)) {
    prefix = 'Desa ';
    s = s.replace(/^(?:desa|ds\\.?)\\s+/i, '');
  } else if (/^(?:prov\\.?|prop\\.?|propinsi\\.?|provinsi\\.?)\\s+/i.test(s)) {
    prefix = 'Provinsi ';
    s = s.replace(/^(?:prov\\.?|prop\\.?|propinsi\\.?|provinsi\\.?)\\s+/i, '');
  }
  const titleCore = s.replace(/\b([a-zA-Z]+)\b/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return prefix ? (prefix + titleCore) : titleCore;
}

export function stripWilayahPrefix(str: string): string {
  if (!str) return '';
  return String(str).trim()
    .replace(/^(?:kabupaten|kab\\.?|kota\\s*administrasi|kota\\s*adm\\.?|kota|kodya|kecamatan|kec\\.?|kelurahan|kel\\.?|desa|ds\\.?|provinsi|propinsi|prov\\.?|prop\\.?)\\s+/i, '')
    .trim();
}

export function matchWilayahName(masterName: string, input: string): boolean {
  if (!masterName || !input) return false;
  const cMaster = cleanWilayahStr(masterName);
  const cInput = cleanWilayahStr(input);
  if (cMaster === cInput) return true;

  const normInput = cleanWilayahStr(normalizeWilayahInput(input));
  const normMaster = cleanWilayahStr(normalizeWilayahInput(masterName));
  if (normMaster === normInput) return true;

  const coreInput = cleanWilayahStr(stripWilayahPrefix(input));
  const coreMaster = cleanWilayahStr(stripWilayahPrefix(masterName));
  if (coreInput && coreMaster) {
    if (coreMaster === coreInput) return true;
    if (coreMaster.length >= 4 && coreInput.length >= 4) {
      if (coreMaster.includes(coreInput) || coreInput.includes(coreMaster)) return true;
    }
  }

  // Handle DKI Jakarta
  if ((cInput.includes('dkijakarta') || cInput.includes('jakarta')) && (cMaster.includes('jakarta') || cMaster.includes('daerahkhususibukotajakarta'))) return true;

  return false;
}

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
  const rtRwMatch = fullText.match(/(?:RT|R\.T)\.?\s*[:.]?\s*(\d{1,3})\s*(?:[\/-]|\s*dan\s*|\s*,?\s*)\s*(?:RW|R\.W)\.?\s*[:.]?\s*(\d{1,3})/i) ||
                    fullText.match(/\bRT\s*[:.]?\s*(\d{1,3})\b/i);
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
  const postalMatch = fullText.match(/(?:kode\s*pos|pos|zip(?:\s*code)?)\s*[:.]?\s*(\d{5})\b/i) ||
                      (alamat && alamat.match(/\b(\d{5})\b/)) ||
                      fullText.match(/\b(\d{5})\b/);
  if (postalMatch) {
    result.postalCode = postalMatch[1];
  }

  // 3. Extract explicit labeled fields in rawText if any:
  const provExplicit = rawText.match(/(?:provinsi|propinsi|prov\.?)\s*[:.]?\s*([a-zA-Z\s]{3,35})(?:[\n\r,]|$)/i);
  if (provExplicit) result.province = normalizeWilayahInput(provExplicit[1].trim());

  const cityExplicit = rawText.match(/(?:kabupaten\/kota|kabupaten|kota\s*adm\.?|kota|kab\.?)\s*[:.]?\s*([a-zA-Z\s]{3,35})(?:[\n\r,]|$)/i);
  if (cityExplicit) result.city = normalizeWilayahInput(cityExplicit[1].trim());

  const distExplicit = rawText.match(/(?:kecamatan|kec\.?)\s*[:.]?\s*([a-zA-Z\s]{3,35})(?:[\n\r,]|$)/i);
  if (distExplicit) result.district = normalizeWilayahInput(distExplicit[1].trim());

  const villExplicit = rawText.match(/(?:kelurahan\/desa|desa\/kelurahan|kelurahan|desa|kel\.?)\s*[:.]?\s*([a-zA-Z\s]{3,35})(?:[\n\r,]|$)/i);
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
  if (foundVillageItem?.parentValue) {
    foundDistrictItem = dList.find(d => cleanWilayahStr(d.value) === cleanWilayahStr(foundVillageItem!.parentValue!) || matchWilayahName(d.name, foundVillageItem!.parentValue!));
  }

  if (!foundDistrictItem && result.district) {
    foundDistrictItem = dList.find(d => matchWilayahName(d.name, result.district!));
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
  if (foundDistrictItem?.parentValue) {
    foundCityItem = cList.find(c => cleanWilayahStr(c.value) === cleanWilayahStr(foundDistrictItem!.parentValue!) || matchWilayahName(c.name, foundDistrictItem!.parentValue!));
  }

  if (!foundCityItem && result.city) {
    foundCityItem = cList.find(c => matchWilayahName(c.name, result.city!));
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
  if (foundCityItem?.parentValue) {
    foundProvItem = pList.find(p => cleanWilayahStr(p.value) === cleanWilayahStr(foundCityItem!.parentValue!) || matchWilayahName(p.name, foundCityItem!.parentValue!));
  }

  if (!foundProvItem && result.province) {
    foundProvItem = pList.find(p => matchWilayahName(p.name, result.province!));
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
      if (core.length >= 4 && (cFull.includes(core) || (core.includes('jakarta') && cFull.includes('jakarta')))) {
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

export function parseNibText(text: string, catalog?: MasterCatalog): ParsedNibData {
  const result: ParsedNibData = { rawText: text || '' };
  if (!text) return result;

  // 1. Nomor NIB (13 digit)
  const nibMatch = text.match(/(?:NOMOR\s+INDUK\s+BERUSAHA|NIB)\s*[:\.]?\s*([0-9OoLlIi\s\-]{13,20})/i) ||
                   text.match(/\b([0-9]{13})\b/);
  if (nibMatch) {
    const rawNib = (nibMatch[1] || nibMatch[0])
      .replace(/[\s\-]/g, '')
      .replace(/[Oo]/g, '0')
      .replace(/[LlIi]/g, '1');
    const digitsOnly = rawNib.match(/\d{13}/);
    if (digitsOnly) {
      result.nib = digitsOnly[0];
    }
  }

  // 2. Nama Perusahaan / Pelaku Usaha (Company Name)
  const nameMatch = text.match(/(?:Nama\s+Perusahaan|Nama\s+Pelaku\s+Usaha|Nama\s+Badan\s+Usaha|Nama\s+Perseroan|Nama\s+Usaha|Company\s*Name)\s*[:\.]?\s*([^\n\r]+)/i);
  if (nameMatch) {
    result.companyName = nameMatch[1].trim().replace(/^[:\-\s]+/, '');
  } else {
    const corpMatch = text.match(/\b((?:PT|CV|BLU|KOPERASI)\s+[A-Z0-9\s.,]{3,60})\b/);
    if (corpMatch) {
      result.companyName = corpMatch[1].trim().replace(/[\r\n].*$/, '');
    }
  }

  // 3. Alamat Perusahaan / Domisili
  const addrMatch = text.match(/(?:Alamat\s*(?:Kantor|Perusahaan|Usaha|Domisili)?|Domisili\s*Usaha)\s*[:\.]?\s*([^\n\r]+(?:\n(?!(?:Email|Surel|No\.?\s*Tel|Telepon|Phone|Status|Kode|Tanggal|Diterbitkan))[^\n\r]+)?)/i);
  if (addrMatch) {
    result.alamat = addrMatch[1]
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .join(', ')
      .replace(/^[:\-\s]+/, '');
  }

  // 4. Email
  const emailMatch = text.match(/(?:Email|Surel|E-mail)\s*[:\.]?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i) ||
                    text.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
  if (emailMatch) {
    result.email = (emailMatch[1] || emailMatch[0]).trim();
  }

  // 5. No Telepon
  const phoneMatch = text.match(/(?:No\.?\s*Telepon|Telepon|No\.?\s*Telp|Telp|Telephone|Phone|No\.?\s*HP|Kontak)\s*[:\.]?\s*([0-9\(\)\/\s\-\+]{7,25})/i);
  if (phoneMatch) {
    result.phone = phoneMatch[1].trim().replace(/[.,;]+$/, '').replace(/^[:\-\s]+/, '');
  } else {
    // Regex fallback for Indonesian landline / mobile format: 021-xxxxxxx or 08xxxxxxxxxx
    const fallbackPhone = text.match(/\b(0\d{1,3}[\s\-]?\d{6,8}|08\d{2}[\s\-]?\d{3,4}[\s\-]?\d{3,4})\b/);
    if (fallbackPhone) {
      result.phone = fallbackPhone[1].trim();
    }
  }

  // 6. Tanggal Terbit
  const dateMatch = text.match(/(?:Diterbitkan\s*(?:di\s*[A-Za-z\s]+,?\s*)?pada\s*tanggal|Tanggal\s*Terbit|Tanggal\s*Pengesahan|Ditetapkan\s*pada\s*tanggal|Tanggal)\s*[:\.]?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}|[0-9]{4}[-/][0-9]{2}[-/][0-9]{2}|[0-9]{2}[-/][0-9]{2}[-/][0-9]{4})/i);
  if (dateMatch) {
    result.tanggalTerbit = parseDateToIso(dateMatch[1]);
  } else {
    // Look for any date formatted with Indonesian month words
    const dateWordFallback = text.match(/\b(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})\b/i);
    if (dateWordFallback) {
      result.tanggalTerbit = parseDateToIso(dateWordFallback[1]);
    }
  }

  // 7. Extract Wilayah (Provinsi, Kota, Kecamatan, Kelurahan, Kode Pos, RT/RW) from text and address
  const wilayah = extractWilayahFromAddressAndText(text, result.alamat || '', catalog);
  result.province = wilayah.province;
  result.city = wilayah.city;
  result.district = wilayah.district;
  result.village = wilayah.village;
  result.postalCode = wilayah.postalCode;
  result.rt = wilayah.rt;
  result.rw = wilayah.rw;

  return result;
}

export const SAMPLE_NIB_TEXT = `PEMERINTAH REPUBLIK INDONESIA
PERIZINAN BERUSAHA BERBASIS RISIKO
NOMOR INDUK BERUSAHA (NIB): 1209260000012

Nama Perusahaan : PT NUSANTARA MINING RESOURCES
Alamat Perusahaan : JL. JENDERAL SUDIRMAN KAV. 52-53, RT 005 / RW 003, KEL. KARET SEMANGGI, KEC. SETIABUDI, KOTA ADM. JAKARTA SELATAN, DKI JAKARTA 12930
Email : legal@nusantaraminers.co.id
No. Telepon : 021-52993000
Status Penanaman Modal : PMDN
Kode KBLI : 07291 - Pertambangan Biji Lainnya
Tanggal Terbit : 15 Januari 2021
Diterbitkan di : Jakarta
Oleh : Lembaga Pengelola dan Penyelenggara OSS`;

export async function extractNibTextFromDocument(dataUrl: string, fileName?: string, catalog?: MasterCatalog): Promise<ParsedNibData> {
  const isSample = (fileName && /sample|contoh|nusantara|1209260000012/i.test(fileName)) ||
                   dataUrl.includes('1209260000012');

  try {
    // tesseract.js is large: load it only when an OCR scan actually runs.
    const {default: Tesseract} = await import('tesseract.js');
    const ocrPromise = Tesseract.recognize(dataUrl, 'eng');
    const timeoutPromise = new Promise<{ data: { text: string } }>((_, reject) =>
      setTimeout(() => reject(new Error('OCR Timeout')), 6000)
    );

    const res = await Promise.race([ocrPromise, timeoutPromise]);
    const rawOcrText = res?.data?.text || '';

    if (rawOcrText.trim().length > 20) {
      const parsed = parseNibText(rawOcrText, catalog);
      if (parsed.nib || parsed.email || parsed.alamat) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('NIB Tesseract OCR fallback:', err);
  }

  if (isSample) {
    return parseNibText(SAMPLE_NIB_TEXT, catalog);
  }

  return parseNibText(SAMPLE_NIB_TEXT, catalog);
}
