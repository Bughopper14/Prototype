/** NIB (OSS) OCR text → company fields. */
import {type MasterCatalog} from '@liugong/shared';
import {extractWilayahFromAddressAndText} from './address-wilayah';

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
  januari: '01',
  jan: '01',
  january: '01',
  februari: '02',
  feb: '02',
  february: '02',
  maret: '03',
  mar: '03',
  march: '03',
  april: '04',
  apr: '04',
  mei: '05',
  may: '05',
  juni: '06',
  jun: '06',
  june: '06',
  juli: '07',
  jul: '07',
  july: '07',
  agustus: '08',
  agt: '08',
  agu: '08',
  august: '08',
  aug: '08',
  september: '09',
  sep: '09',
  sept: '09',
  oktober: '10',
  okt: '10',
  october: '10',
  oct: '10',
  november: '11',
  nov: '11',
  desember: '12',
  des: '12',
  december: '12',
  dec: '12',
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

export function parseNibText(text: string, catalog?: MasterCatalog): ParsedNibData {
  const result: ParsedNibData = {rawText: text || ''};
  if (!text) return result;

  // 1. Nomor NIB (13 digit)
  const nibMatch =
    text.match(/(?:NOMOR\s+INDUK\s+BERUSAHA|NIB)\s*[:\.]?\s*([0-9OoLlIi\s\-]{13,20})/i) ||
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
  const nameMatch = text.match(
    /(?:Nama\s+Perusahaan|Nama\s+Pelaku\s+Usaha|Nama\s+Badan\s+Usaha|Nama\s+Perseroan|Nama\s+Usaha|Company\s*Name)\s*[:\.]?\s*([^\n\r]+)/i,
  );
  if (nameMatch) {
    result.companyName = nameMatch[1].trim().replace(/^[:\-\s]+/, '');
  } else {
    const corpMatch = text.match(/\b((?:PT|CV|BLU|KOPERASI)\s+[A-Z0-9\s.,]{3,60})\b/);
    if (corpMatch) {
      result.companyName = corpMatch[1].trim().replace(/[\r\n].*$/, '');
    }
  }

  // 3. Alamat Perusahaan / Domisili
  const addrMatch = text.match(
    /(?:Alamat\s*(?:Kantor|Perusahaan|Usaha|Domisili)?|Domisili\s*Usaha)\s*[:\.]?\s*([^\n\r]+(?:\n(?!(?:Email|Surel|No\.?\s*Tel|Telepon|Phone|Status|Kode|Tanggal|Diterbitkan))[^\n\r]+)?)/i,
  );
  if (addrMatch) {
    result.alamat = addrMatch[1]
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .join(', ')
      .replace(/^[:\-\s]+/, '');
  }

  // 4. Email
  const emailMatch =
    text.match(/(?:Email|Surel|E-mail)\s*[:\.]?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i) ||
    text.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
  if (emailMatch) {
    result.email = (emailMatch[1] || emailMatch[0]).trim();
  }

  // 5. No Telepon
  const phoneMatch = text.match(
    /(?:No\.?\s*Telepon|Telepon|No\.?\s*Telp|Telp|Telephone|Phone|No\.?\s*HP|Kontak)\s*[:\.]?\s*([0-9\(\)\/\s\-\+]{7,25})/i,
  );
  if (phoneMatch) {
    result.phone = phoneMatch[1]
      .trim()
      .replace(/[.,;]+$/, '')
      .replace(/^[:\-\s]+/, '');
  } else {
    // Regex fallback for Indonesian landline / mobile format: 021-xxxxxxx or 08xxxxxxxxxx
    const fallbackPhone = text.match(/\b(0\d{1,3}[\s\-]?\d{6,8}|08\d{2}[\s\-]?\d{3,4}[\s\-]?\d{3,4})\b/);
    if (fallbackPhone) {
      result.phone = fallbackPhone[1].trim();
    }
  }

  // 6. Tanggal Terbit
  const dateMatch = text.match(
    /(?:Diterbitkan\s*(?:di\s*[A-Za-z\s]+,?\s*)?pada\s*tanggal|Tanggal\s*Terbit|Tanggal\s*Pengesahan|Ditetapkan\s*pada\s*tanggal|Tanggal)\s*[:\.]?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}|[0-9]{4}[-/][0-9]{2}[-/][0-9]{2}|[0-9]{2}[-/][0-9]{2}[-/][0-9]{4})/i,
  );
  if (dateMatch) {
    result.tanggalTerbit = parseDateToIso(dateMatch[1]);
  } else {
    // Look for any date formatted with Indonesian month words
    const dateWordFallback = text.match(
      /\b(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})\b/i,
    );
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
