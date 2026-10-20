import { api } from './api';

export interface ParsedKtpData {
  nik?: string;
  nama?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  tempatTglLahir?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE';
  golonganDarah?: string;
  status?: string;
  maritalStatus?: string;
  kewarganegaraan?: string;
  citizenship?: 'WNI' | 'WNA';
  alamat?: string;
  rtRw?: string;
  rt?: string;
  rw?: string;
  kelDesa?: string;
  village?: string;
  kecamatan?: string;
  district?: string;
  province?: string;
  cityRegency?: string;
  city?: string;
  kodePos?: string;
  postalCode?: string;
  agama?: string;
  pekerjaan?: string;
  berlaku_hingga?: string;
  rawText: string;
}

export interface ParsedPassportData {
  passportNumber?: string;
  countryCode?: string;
  countryName?: string;
  fullName?: string;
  surname?: string;
  givenNames?: string;
  nationality?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  gender?: 'MALE' | 'FEMALE';
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  personalId?: string;
  mrzLine1?: string;
  mrzLine2?: string;
  rawText: string;
}

export interface ParsedNpwpData {
  npwpNumber?: string;
  rawNpwp?: string;
  nama?: string;
  nik?: string;
  alamat?: string;
  kelurahanKecamatan?: string;
  kotaProvinsi?: string;
  kpp?: string;
  tanggalTerdaftar?: string;
  rawText: string;
}

export interface ParsedKitasData {
  permitNumber?: string;
  niora?: string;
  nama?: string;
  kewarganegaraan?: string;
  tanggalLahir?: string;
  gender?: 'MALE' | 'FEMALE';
  berlakuHingga?: string;
  instansiPenerbit?: string;
  rawText: string;
}

export const INDO_MONTH_MAP: Record<string, string> = {
  'JAN': '01', 'JANUARI': '01', 'JANUARY': '01',
  'FEB': '02', 'FEBRUARI': '02', 'FEBRUARY': '02',
  'MAR': '03', 'MARET': '03', 'MARCH': '03',
  'APR': '04', 'APRIL': '04',
  'MEI': '05', 'MAY': '05',
  'JUN': '06', 'JUNI': '06', 'JUNE': '06',
  'JUL': '07', 'JULI': '07', 'JULY': '07',
  'AGU': '08', 'AGT': '08', 'AGUSTUS': '08', 'AUG': '08', 'AUGUST': '08',
  'SEP': '09', 'SEPTEMBER': '09',
  'OKT': '10', 'OCT': '10', 'OKTOBER': '10', 'OCTOBER': '10',
  'NOV': '11', 'NOP': '11', 'NOVEMBER': '11',
  'DES': '12', 'DEC': '12', 'DESEMBER': '12', 'DECEMBER': '12',
};

export function normalizeBirthDate(raw?: string | null): string {
  if (!raw) return '';
  const s = String(raw).trim().toUpperCase();

  // 1. ISO format: YYYY-MM-DD
  const mIso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (mIso) {
    return `${mIso[1].padStart(4, '0')}-${mIso[2].padStart(2, '0')}-${mIso[3].padStart(2, '0')}`;
  }

  // 2. DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const mDmy = s.match(/\b(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})\b/);
  if (mDmy) {
    return `${mDmy[3].padStart(4, '0')}-${mDmy[2].padStart(2, '0')}-${mDmy[1].padStart(2, '0')}`;
  }

  // 3. DD MonthName YYYY (e.g. 5 JULI 2001, 14-FEBRUARI-1995)
  const mText = s.match(/\b(\d{1,2})[-\s/\.]+([A-Z]+)[-\s/\.]+(\d{4})\b/);
  if (mText) {
    const d = mText[1].padStart(2, '0');
    const mStr = mText[2];
    const y = mText[3];
    let mNum = INDO_MONTH_MAP[mStr];
    if (!mNum) {
      for (const [k, v] of Object.entries(INDO_MONTH_MAP)) {
        if (mStr.startsWith(k) || k.startsWith(mStr)) {
          mNum = v;
          break;
        }
      }
    }
    if (mNum) {
      return `${y}-${mNum}-${d}`;
    }
  }

  return '';
}

export function parseBirthPlaceAndDate(rawStr?: string | null): { place: string; date: string; rawDate: string } {
  if (!rawStr) return { place: '', date: '', rawDate: '' };
  let cleaned = String(rawStr).replace(/^(?:tempat|pat)?[/\s]*tgl[a-z/\s]*lahir\s*[:.,\-–\uff1a]?\s*/i, '').trim();
  cleaned = cleaned.replace(/^[:.,\-–\uff1a\s]+/, '').trim();

  let place = '';
  let rawDate = '';

  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    place = parts[0].trim();
    rawDate = parts.slice(1).join(' ').trim();
  } else {
    const m = cleaned.match(/(\d{1,2}[-\s/\.]+[A-Za-z]+[-\s/\.]+\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})/);
    if (m && m.index !== undefined) {
      place = cleaned.slice(0, m.index).trim();
      rawDate = m[0].trim();
    } else {
      place = cleaned;
    }
  }

  place = place.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9\s]+$/g, '').trim().toUpperCase();
  const dateIso = normalizeBirthDate(rawDate);
  return { place, date: dateIso, rawDate };
}

export function splitPersonName(fullName: string) {
  const parts = String(fullName || '').trim().toUpperCase().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
    lastName: parts.length > 1 ? parts[parts.length - 1] : ''
  };
}

// -------------------------------------------------------------
// KTP Parser (Adopted from robust NIB line & window token logic)
// -------------------------------------------------------------
export function parseKtpText(text: string): ParsedKtpData {
  const result: ParsedKtpData = { rawText: text || '' };
  if (!text) return result;

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. NIK (16 digit angka with OCR correction)
  const cleanNikStr = (s: string) => {
    let res = s.toUpperCase();
    res = res.replace(/O/g, '0').replace(/D/g, '0').replace(/[IL]/g, '1').replace(/B/g, '8').replace(/S/g, '5').replace(/Z/g, '2');
    return res.replace(/\D/g, '');
  };

  const nikMatch = text.match(/(?:NIK|N1K|N!K|NlK|Nomor\s*Induk)\s*[:.\-–—]*\s*([0-9A-Za-z\s]{14,22})/i) || text.match(/\b([0-9]{16})\b/);
  if (nikMatch) {
    const digits = cleanNikStr(nikMatch[1]);
    if (digits.length >= 16) {
      result.nik = digits.slice(0, 16);
    }
  }
  if (!result.nik) {
    for (const line of lines) {
      if (/NIK|Nomor/i.test(line)) {
        const d = cleanNikStr(line);
        if (d.length >= 16) {
          result.nik = d.slice(0, 16);
          break;
        }
      }
    }
  }
  if (!result.nik) {
    const all16 = text.match(/\b\d{16}\b/);
    if (all16) result.nik = all16[0];
  }

  // 2. Provinsi & Kota / Kabupaten
  const provMatch = text.match(/PROVINSI\s+([^\n\r]+)/i);
  if (provMatch) result.province = provMatch[1].replace(/^[~*:\-–—\s]+/, '').trim().toUpperCase();
  const kabMatch = text.match(/(?:KABUPATEN|KOTA)\s+([^\n\r]+)/i);
  if (kabMatch) result.cityRegency = kabMatch[1].replace(/^[~*:\-–—\s]+/, '').trim().toUpperCase();
  if (result.cityRegency) result.city = result.cityRegency;

  // 3. Nama
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(?:\d+[\.\)]\s*)?nama\s*[:.\-–—=~]+(.*)$/i);
    if (m) {
      let cand = m[1].replace(/[^a-zA-Z\s\.,'-]/g, '').trim();
      if (cand.length >= 3 && !/tempat|lahir|nik|alamat/i.test(cand)) {
        result.nama = cand.toUpperCase();
        break;
      } else if (!cand && i + 1 < lines.length) {
        let nextCand = lines[i + 1].replace(/[^a-zA-Z\s\.,'-]/g, '').trim();
        if (nextCand.length >= 3 && !/tempat|lahir|nik|alamat|jenis/i.test(nextCand)) {
          result.nama = nextCand.toUpperCase();
          break;
        }
      }
    }
  }
  if (!result.nama) {
    const nameMatch = text.match(/Nama\s*[:.\-–—=~]*\s*([A-Za-z\s\.,'-]{3,40})(?:$|\n|tempat|lahir)/i);
    if (nameMatch) {
      result.nama = nameMatch[1].trim().toUpperCase();
    }
  }
  if (result.nama) {
    const parts = result.nama.split(/\s+/).filter(Boolean);
    result.firstName = parts[0] || '';
    result.middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
    result.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
  }

  // 4. Tempat & Tanggal Lahir
  const dobMatch = text.match(/(?:Tempat|pat)?[/\s]*Tgl[a-z/\s]*Lahir\s*[:.\-–—=~]*\s*([^\n\r]+)/i);
  if (dobMatch) {
    const parsed = parseBirthPlaceAndDate(dobMatch[1]);
    result.tempatLahir = parsed.place;
    result.tanggalLahir = parsed.date;
    result.dateOfBirth = parsed.date;
    result.tempatTglLahir = parsed.place + (parsed.date ? `, ${parsed.date}` : (parsed.rawDate ? `, ${parsed.rawDate}` : ''));
  } else {
    const commaDateMatch = text.match(/([a-zA-Z\s]{3,20})\s*,\s*(\d{1,2}[-\s/\.]+[A-Za-z]+[-\s/\.]+\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})/);
    if (commaDateMatch) {
      const parsed = parseBirthPlaceAndDate(commaDateMatch[0]);
      if (parsed.place) result.tempatLahir = parsed.place;
      if (parsed.date) {
        result.tanggalLahir = parsed.date;
        result.dateOfBirth = parsed.date;
        result.tempatTglLahir = `${parsed.place}, ${parsed.date}`;
      }
    }
  }

  // 5. Jenis Kelamin & Golongan Darah
  if (/\b(?:LAKI-LAKI|LAKI|LAKL|PRIA|MALE)\b/i.test(text)) {
    result.gender = 'MALE';
  } else if (/\b(?:PEREMPUAN|WANITA|FEMALE)\b/i.test(text)) {
    result.gender = 'FEMALE';
  }

  const gdMatch = text.match(/(?:gol[.,\s]*darah|darah)\s*[:.\-–—\s]*([ABO0]{1,2})\b/i);
  if (gdMatch) {
    const gd = gdMatch[1].toUpperCase().replace('0', 'O');
    if (['A', 'B', 'AB', 'O'].includes(gd)) {
      result.golonganDarah = gd;
    }
  }

  // 6. Alamat
  for (const line of lines) {
    const m = line.match(/^(?:\d+[\.\)]\s*)?alamat[\s:.\-–—=~]+(.*)$/i);
    if (m) {
      let cand = m[1].replace(/^[:.\-–—=~*+\s]+/, '').trim();
      cand = cand.split(/\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA)\b/i)[0].trim();
      if (cand && cand.length >= 3 && !/^\d{1,3}\/\d{1,3}$/.test(cand)) {
        result.alamat = cand.toUpperCase();
        break;
      }
    }
  }
  if (!result.alamat) {
    const stLine = lines.find(l => /\b(?:JL|JALAN|KP|KAMPUNG|KOMP|KOMPLEK|GG|GANG|BLOK|DUSUN)\b/i.test(l) && !/^(?:PROVINSI|KOTA|KABUPATEN)/i.test(l));
    if (stLine) {
      let cand = stLine.replace(/^[:.\-–—=~*+\s]+/, '').trim();
      cand = cand.split(/\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA)\b/i)[0].trim();
      if (cand && cand.length >= 4) result.alamat = cand.toUpperCase();
    }
  }

  // 7. RT & RW
  const rtrwMatch = text.match(/(?:RT\s*[\/\.]?\s*RW|RT\s*RW|RTRW)\s*[:.\-–—=~]*\s*([^\n\r]+)/i);
  if (rtrwMatch) {
    const m = rtrwMatch[1].match(/\b(\d{1,3})\s*[/,\-\\\|]\s*(\d{1,3})\b/);
    if (m) {
      result.rt = m[1].padStart(3, '0');
      result.rw = m[2].padStart(3, '0');
      result.rtRw = `${result.rt}/${result.rw}`;
    }
  }

  // 8. Kel/Desa
  const kelMatch = text.match(/(?:Kel\s*[\/\.]?\s*Desa|Kelurahan|Desa)\s*[:.\-–—=~]*\s*([A-Za-z0-9\s]+?)(?:$|\n|Kecamatan|RT|RW)/i);
  if (kelMatch) {
    result.kelDesa = kelMatch[1].replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
    result.village = result.kelDesa;
  }

  // 9. Kecamatan
  const kecMatch = text.match(/(?:Kecamatan|Kec\.?)\s*[:.\-–—=~]*\s*([A-Za-z0-9\s]+?)(?:$|\n|Kabupaten|Kota|Agama)/i);
  if (kecMatch) {
    result.kecamatan = kecMatch[1].replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
    result.district = result.kecamatan;
  }

  // 10. Agama
  const rels = ['ISLAM', 'KRISTEN', 'KATHOLIK', 'KATOLIK', 'HINDU', 'BUDDHA', 'BUDHA', 'KHONGHUCU'];
  for (const r of rels) {
    if (new RegExp(`\\b${r}\\b`, 'i').test(text)) {
      result.agama = r === 'KATOLIK' ? 'KATHOLIK' : r === 'BUDHA' ? 'BUDDHA' : r;
      break;
    }
  }

  // 11. Status Perkawinan (cek kata 'BELUM' atau 'TIDAK' terlebih dahulu sebelum 'KAWIN')
  const statusMatch = text.match(/(?:Status\s*Perkawinan|Status)\s*[:.\-–—=~]*\s*([^\n\r]+)/i);
  const statusText = statusMatch ? statusMatch[1].toUpperCase() : text.toUpperCase();
  if (/\b(?:BELUM|TIDAK)\b/i.test(statusText) || /\bBELUM\s*KAWIN\b/i.test(text) || /\bSINGLE\b/i.test(text)) {
    result.status = 'SINGLE';
    result.maritalStatus = 'SINGLE';
  } else if (/\bCERAI\b/i.test(statusText)) {
    result.status = 'DIVORCED';
    result.maritalStatus = 'DIVORCED';
  } else if (/\b(?:KAWIN|NIKAH|MARRIED)\b/i.test(statusText)) {
    result.status = 'MARRIED';
    result.maritalStatus = 'MARRIED';
  } else {
    result.status = 'SINGLE';
    result.maritalStatus = 'SINGLE';
  }

  // 12. Pekerjaan
  const pekMatch = text.match(/(?:Pekerjaan|Pekeriaan)\s*[:.\-–—=~]*\s*([^\n\r]+)/i);
  if (pekMatch) {
    let p = pekMatch[1].trim().toUpperCase();
    if (p.includes('WIRA')) result.pekerjaan = 'WIRASWASTA';
    else if (p.includes('SWASTA')) result.pekerjaan = 'KARYAWAN SWASTA';
    else if (p.includes('PNS') || p.includes('NEGERI')) result.pekerjaan = 'PEGAWAI NEGERI SIPIL';
    else if (p.includes('PELAJAR') || p.includes('MAHASISWA')) result.pekerjaan = 'PELAJAR/MAHASISWA';
    else if (p.includes('RUMAH TANGGA')) result.pekerjaan = 'IBU RUMAH TANGGA';
    else result.pekerjaan = p.replace(/[^A-Z\s]/g, '').trim();
  }

  // 13. Kewarganegaraan
  if (/\bWNA\b/i.test(text) || /\bFOREIGN|CHINA|MALAYSIA|SINGAPORE\b/i.test(text)) {
    result.kewarganegaraan = 'WNA';
    result.citizenship = 'WNA';
  } else {
    result.kewarganegaraan = 'WNI';
    result.citizenship = 'WNI';
  }

  result.berlaku_hingga = 'SEUMUR HIDUP';
  return result;
}

export function resolveGender(val?: any): 'MALE' | 'FEMALE' | undefined {
  if (!val) return undefined;
  const s = String(val).toUpperCase().trim();
  if (
    s === 'F' ||
    s === 'P' ||
    s.includes('FEMALE') ||
    s.includes('PEREMPUAN') ||
    s.includes('(F)') ||
    s.includes('/F') ||
    s.includes('/ P') ||
    s.includes('WANITA')
  ) {
    return 'FEMALE';
  }
  if (
    s === 'M' ||
    s === 'L' ||
    s.includes('MALE') ||
    s.includes('LAKI') ||
    s.includes('(M)') ||
    s.includes('/M') ||
    s.includes('/ L') ||
    s.includes('PRIA')
  ) {
    return 'MALE';
  }
  return undefined;
}

// -------------------------------------------------------------
// Passport Parser
// -------------------------------------------------------------
export function parsePassportText(text: string): ParsedPassportData {
  const result: ParsedPassportData = { rawText: text || '' };
  if (!text) return result;

  // Passport number pattern (e.g. A12345678, C12345678, E12345678)
  const pMatch = text.match(/(?:passport\s*no\.?|paspor\s*no\.?|no\.?\s*paspor)[\s:.\-–—]*([A-Z0-9]{7,10})/i) ||
                 text.match(/\b([A-Z][0-9]{7,8})\b/i);
  if (pMatch) result.passportNumber = pMatch[1].toUpperCase();

  // Country Code / Name
  const cMatch = text.match(/(?:country\s*code|kode\s*negara)[\s:.\-–—]*([A-Z]{3})\b/i) ||
                 text.match(/\b(IDN|CHN|USA|MYS|SGP|JPN|KOR|AUS|GBR|DEU|FRA)\b/i);
  if (cMatch) {
    result.countryCode = cMatch[1].toUpperCase();
    const mapName: Record<string, string> = { IDN: 'INDONESIA', CHN: 'CHINA', MYS: 'MALAYSIA', SGP: 'SINGAPORE', USA: 'UNITED STATES' };
    result.countryName = mapName[result.countryCode] || result.countryCode;
    result.nationality = result.countryName;
  }

  // Full Name / Surname / Given Names
  const nameMatch = text.match(/(?:full\s*name|nama\s*lengkap|name)[\s:.\-–—=~]*([A-Za-z\s\.,'-]{3,50})/i);
  if (nameMatch) {
    result.fullName = nameMatch[1].trim().toUpperCase();
    const parts = result.fullName.split(/\s+/).filter(Boolean);
    result.givenNames = parts.slice(0, -1).join(' ') || parts[0];
    result.surname = parts.length > 1 ? parts[parts.length - 1] : '';
  }

  // Date of Birth
  const dobMatch = text.match(/(?:date\s*of\s*birth|tgl\s*lahir|birth\s*date)[\s:.\-–—=~]*([^\n\r]+)/i);
  if (dobMatch) {
    result.dateOfBirth = normalizeBirthDate(dobMatch[1]);
  }

  // Place of Birth
  const pobMatch = text.match(/(?:place\s*of\s*birth|tempat\s*lahir)[\s:.\-–—=~]*([A-Za-z\s]+)/i);
  if (pobMatch) result.placeOfBirth = pobMatch[1].trim().toUpperCase();

  // Gender / Sex
  const genMatch = text.match(/(?:SEX|GENDER|JENIS\s*KELAMIN)[\s:.\-–—=~]*([^\n\r]+)/i);
  if (genMatch) {
    result.gender = resolveGender(genMatch[1]);
  }
  if (!result.gender) {
    if (/\b(?:F|FEMALE|PEREMPUAN|WANITA)\b/i.test(text)) result.gender = 'FEMALE';
    else if (/\b(?:M|MALE|LAKI-LAKI|LAKI|PRIA)\b/i.test(text)) result.gender = 'MALE';
  }

  // Issue / Expiry dates
  const expMatch = text.match(/(?:date\s*of\s*expiry|berlaku\s*sampai|expiry\s*date)[\s:.\-–—=~]*([^\n\r]+)/i);
  if (expMatch) result.expiryDate = normalizeBirthDate(expMatch[1]);

  const issMatch = text.match(/(?:date\s*of\s*issue|tgl\s*pengeluaran|issue\s*date)[\s:.\-–—=~]*([^\n\r]+)/i);
  if (issMatch) result.issueDate = normalizeBirthDate(issMatch[1]);

  // Authority
  const authMatch = text.match(/(?:authority|kantor\s*penerbit|issuing\s*office)[\s:.\-–—=~]*([^\n\r]+)/i);
  if (authMatch) result.issuingAuthority = authMatch[1].trim().toUpperCase();

  // MRZ lines
  const mrz1 = text.match(/P<[A-Z0-9<]{40,44}/);
  if (mrz1) result.mrzLine1 = mrz1[0];
  const mrz2 = text.match(/[A-Z0-9<]{40,44}/g);
  if (mrz2 && mrz2.length > 1) result.mrzLine2 = mrz2[1];

  return result;
}

// -------------------------------------------------------------
// NPWP Parser
// -------------------------------------------------------------
export function parseNpwpText(text: string): ParsedNpwpData {
  const result: ParsedNpwpData = { rawText: text || '' };
  if (!text) return result;

  // NPWP format 15 digit (xx.xxx.xxx.x-xxx.xxx) or 16 digit
  const npwpPattern = /(\d{2}[.\s]?\d{3}[.\s]?\d{3}[.\s]?[0-9A-Z]{1}[-\s]?\d{3}[.\s]?\d{3})/;
  const m = text.match(npwpPattern);
  if (m) {
    const rawVal = m[1].replace(/\s/g, '');
    result.npwpNumber = rawVal;
    result.rawNpwp = rawVal.replace(/\D/g, '');
    if (result.rawNpwp.length >= 12) {
      result.kpp = result.rawNpwp.slice(9, 12);
    }
  } else {
    const rawDigits = text.match(/\b(\d{15,16})\b/);
    if (rawDigits) {
      result.rawNpwp = rawDigits[1];
      if (rawDigits[1].length === 15) {
        const d = rawDigits[1];
        result.npwpNumber = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}.${d[8]}-${d.slice(9, 12)}.${d.slice(12)}`;
        result.kpp = d.slice(9, 12);
      } else {
        result.npwpNumber = rawDigits[1];
      }
    }
  }

  // Nama Wajib Pajak
  const nameMatch = text.match(/(?:nama\s*wajib\s*pajak|nama\s*wp|nama)[\s:.\-–—=~]*([A-Za-z0-9\s\.,\(\)'-]{3,50})(?:$|\n|nik|alamat)/i);
  if (nameMatch) {
    result.nama = nameMatch[1].trim().toUpperCase();
  }

  // NIK
  const nikMatch = text.match(/(?:nik|no\.?\s*ktp)[\s:.\-–—]*(\d{16})\b/i);
  if (nikMatch) result.nik = nikMatch[1];

  // Alamat
  const alMatch = text.match(/(?:alamat|domisili)[\s:.\-–—=~]*([^\n\r]+)/i);
  if (alMatch) result.alamat = alMatch[1].trim().toUpperCase();

  // KPP
  const kppMatch = text.match(/(?:kpp|kantor\s*pelayanan\s*pajak)[\s:.\-–—]*([A-Za-z0-9\s]+)/i);
  if (kppMatch) result.kpp = kppMatch[1].trim().toUpperCase();

  // Tanggal terdaftar
  const tglMatch = text.match(/(?:terdaftar|tanggal\s*daftar)[\s:.\-–—]*([^\n\r]+)/i);
  if (tglMatch) result.tanggalTerdaftar = normalizeBirthDate(tglMatch[1]);

  return result;
}

// -------------------------------------------------------------
// KITAS / ITAS Parser
// -------------------------------------------------------------
export function parseKitasText(text: string): ParsedKitasData {
  const result: ParsedKitasData = { rawText: text || '' };
  if (!text) return result;

  // Permit No / No Izin Tinggal
  const pMatch = text.match(/(?:izin\s*tinggal|permit\s*no\.?|kitas\s*no\.?|itas\s*no\.?)[\s:.\-–—]*([A-Za-z0-9\/\-]{8,25})/i);
  if (pMatch) result.permitNumber = pMatch[1].trim().toUpperCase();

  // NIORA
  const nMatch = text.match(/(?:niora|no\.?\s*register)[\s:.\-–—]*([A-Za-z0-9]{8,20})/i);
  if (nMatch) result.niora = nMatch[1].trim().toUpperCase();

  // Nama
  const nameMatch = text.match(/(?:nama\s*lengkap|name)[\s:.\-–—=~]*([A-Za-z\s\.,'-]{3,50})/i);
  if (nameMatch) result.nama = nameMatch[1].trim().toUpperCase();

  // Kewarganegaraan
  const kwMatch = text.match(/(?:kewarganegaraan|nationality)[\s:.\-–—=~]*([A-Za-z\s]+)/i);
  if (kwMatch) result.kewarganegaraan = kwMatch[1].trim().toUpperCase();

  // Tanggal lahir
  const dobMatch = text.match(/(?:date\s*of\s*birth|tgl\s*lahir)[\s:.\-–—=~]*([^\n\r]+)/i);
  if (dobMatch) result.tanggalLahir = normalizeBirthDate(dobMatch[1]);

  // Gender
  if (/\b(?:SEX|GENDER)[\s:.\-–—=~]*(?:M|MALE|LAKI)\b/i.test(text)) result.gender = 'MALE';
  else if (/\b(?:SEX|GENDER)[\s:.\-–—=~]*(?:F|FEMALE|PEREMPUAN)\b/i.test(text)) result.gender = 'FEMALE';

  // Berlaku Hingga
  const expMatch = text.match(/(?:berlaku\s*sampai|valid\s*until|expiry)[\s:.\-–—=~]*([^\n\r]+)/i);
  if (expMatch) result.berlakuHingga = normalizeBirthDate(expMatch[1]);

  result.instansiPenerbit = 'Direktorat Jenderal Imigrasi Kementerian Hukum & HAM RI';
  return result;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// -------------------------------------------------------------
// Unified Scanner Caller
// -------------------------------------------------------------
export async function extractIdDocumentFromImage(
  fileOrInput: File | Blob | string,
  docType: 'ktp' | 'passport' | 'npwp' | 'kitas' = 'ktp',
  fileName?: string
): Promise<{
  docType: string;
  data: any;
  rawText: string;
}> {
  try {
    const uploadPayload = new FormData();
    if (typeof fileOrInput === 'string') {
      if (fileOrInput.startsWith('data:')) {
        const b = dataUrlToBlob(fileOrInput);
        uploadPayload.append('file', b, fileName || `${docType}_scan.jpg`);
      } else {
        uploadPayload.append('file', new Blob([fileOrInput]), fileName || `${docType}_scan.txt`);
      }
    } else if (fileOrInput instanceof File) {
      uploadPayload.append('file', fileOrInput);
    } else if (fileOrInput instanceof Blob) {
      uploadPayload.append('file', fileOrInput, fileName || `${docType}_scan.jpg`);
    }
    uploadPayload.append('doc_type', docType);

    const res = await api('/ocr/scan', 'POST', uploadPayload);
    if (res && res.data) {
      const d = res.data;
      return {
        docType: res.doc_type || docType,
        data: d,
        rawText: typeof d === 'string' ? d : JSON.stringify(d, null, 2)
      };
    }
  } catch (err) {
    console.warn(`[${docType.toUpperCase()} OCR] Scan error:`, err);
  }

  // Fallback to local regex if string was passed
  if (typeof fileOrInput === 'string' && !fileOrInput.startsWith('data:')) {
    if (docType === 'passport') return { docType: 'passport', data: parsePassportText(fileOrInput), rawText: fileOrInput };
    if (docType === 'npwp') return { docType: 'npwp', data: parseNpwpText(fileOrInput), rawText: fileOrInput };
    if (docType === 'kitas') return { docType: 'kitas', data: parseKitasText(fileOrInput), rawText: fileOrInput };
    return { docType: 'ktp', data: parseKtpText(fileOrInput), rawText: fileOrInput };
  }

  return {
    docType,
    data: {},
    rawText: ''
  };
}

export async function extractKtpTextFromImage(fileOrInput: File | Blob | string, fileName?: string): Promise<ParsedKtpData> {
  const res = await extractIdDocumentFromImage(fileOrInput, 'ktp', fileName);
  const d = res.data || {};
  const sLower = String(d.status_perkawinan || d.maritalStatus || d.status || '').toLowerCase();
  const isSingle = sLower.includes('belum') || sLower.includes('tidak') || sLower.includes('single');
  const isMarried = !isSingle && (sLower.includes('kawin') || sLower.includes('nikah') || sLower.includes('married'));
  const isDivorced = sLower.includes('cerai') || sLower.includes('divorced') || sLower.includes('widowed');
  const resolvedMarital = isSingle ? 'SINGLE' : isMarried ? 'MARRIED' : isDivorced ? 'DIVORCED' : 'SINGLE';

  return {
    nik: d.nik || d.idNumber,
    nama: d.nama || d.name,
    firstName: d.firstName,
    middleName: d.middleName,
    lastName: d.lastName,
    tempatLahir: d.tempat_lahir || d.tempatLahir,
    tanggalLahir: d.tanggal_lahir || d.tanggalLahir || d.dateOfBirth,
    dateOfBirth: d.tanggal_lahir || d.dateOfBirth,
    tempatTglLahir: d.tempatTglLahir || (d.tempat_lahir ? `${d.tempat_lahir}, ${d.tanggal_lahir || ''}` : ''),
    gender: (d.gender === 'FEMALE' || String(d.jenis_kelamin).toUpperCase().includes('PEREMPUAN')) ? 'FEMALE' : 'MALE',
    golonganDarah: d.golongan_darah || d.golonganDarah,
    status: resolvedMarital,
    maritalStatus: resolvedMarital,
    kewarganegaraan: d.kewarganegaraan || 'WNI',
    citizenship: String(d.kewarganegaraan || '').toUpperCase().includes('WNA') ? 'WNA' : 'WNI',
    alamat: d.alamat || d.address || d.fullAddress,
    rtRw: d.rt_rw || d.rtRw,
    rt: d.rt,
    rw: d.rw,
    kelDesa: d.kel_desa || d.village,
    village: d.kel_desa || d.village,
    kecamatan: d.kecamatan || d.district,
    district: d.kecamatan || d.district,
    province: d.provinsi || d.province,
    cityRegency: d.kabupaten_kota || d.cityRegency || d.city,
    city: d.kabupaten_kota || d.cityRegency || d.city,
    kodePos: d.kode_pos || d.postalCode,
    postalCode: d.kode_pos || d.postalCode,
    agama: d.agama,
    pekerjaan: d.pekerjaan || d.occupation,
    berlaku_hingga: d.berlaku_hingga || 'SEUMUR HIDUP',
    rawText: res.rawText || ''
  };
}

export async function extractPassportTextFromImage(fileOrInput: File | Blob | string, fileName?: string): Promise<ParsedPassportData> {
  const res = await extractIdDocumentFromImage(fileOrInput, 'passport', fileName);
  const d = res.data || {};
  const resolvedGen = resolveGender(d.gender) || resolveGender(d.jenis_kelamin) || resolveGender(d.sex) || undefined;
  return {
    passportNumber: d.passport_number || d.passportNumber,
    countryCode: d.country_code || d.countryCode,
    countryName: d.country_name || d.countryName || d.nationality,
    fullName: d.nama || d.fullName,
    surname: d.surname,
    givenNames: d.given_names || d.givenNames,
    nationality: d.nationality || d.country_name,
    dateOfBirth: d.tanggal_lahir || d.dateOfBirth,
    placeOfBirth: d.tempat_lahir || d.placeOfBirth,
    gender: resolvedGen,
    issueDate: d.tanggal_pengeluaran || d.issueDate,
    expiryDate: d.tanggal_berlaku || d.expiryDate,
    issuingAuthority: d.kantor_penerbit || d.issuingAuthority,
    personalId: d.personal_id || d.personalId,
    mrzLine1: d.mrz_line1 || d.mrzLine1,
    mrzLine2: d.mrz_line2 || d.mrzLine2,
    rawText: res.rawText || ''
  };
}

export async function extractNpwpTextFromImage(fileOrInput: File | Blob | string, fileName?: string): Promise<ParsedNpwpData> {
  const res = await extractIdDocumentFromImage(fileOrInput, 'npwp', fileName);
  const d = res.data || {};
  return {
    npwpNumber: d.npwp_number || d.npwpNumber,
    rawNpwp: d.raw_npwp || d.rawNpwp,
    nama: d.nama,
    nik: d.nik,
    alamat: d.alamat,
    kelurahanKecamatan: d.kelurahan_kecamatan || d.kelurahanKecamatan,
    kotaProvinsi: d.kota_provinsi || d.kotaProvinsi,
    kpp: d.kpp,
    tanggalTerdaftar: d.tanggal_terdaftar || d.tanggalTerdaftar,
    rawText: res.rawText || ''
  };
}

export async function extractKitasTextFromImage(fileOrInput: File | Blob | string, fileName?: string): Promise<ParsedKitasData> {
  const res = await extractIdDocumentFromImage(fileOrInput, 'kitas', fileName);
  const d = res.data || {};
  const resolvedGen = resolveGender(d.gender) || resolveGender(d.jenis_kelamin) || resolveGender(d.sex) || undefined;
  return {
    permitNumber: d.permit_number || d.permitNumber,
    niora: d.niora,
    nama: d.nama,
    kewarganegaraan: d.kewarganegaraan,
    tanggalLahir: d.tanggal_lahir || d.tanggalLahir,
    gender: resolvedGen,
    berlakuHingga: d.berlaku_hingga || d.berlakuHingga,
    instansiPenerbit: d.instansi_penerbit || d.instansiPenerbit || 'Direktorat Jenderal Imigrasi',
    rawText: res.rawText || ''
  };
}
