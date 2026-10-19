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

export function parseKtpText(text: string): ParsedKtpData {
  const result: ParsedKtpData = { rawText: text || '' };
  if (!text) return result;

  // 1. NIK (16 digits)
  const nikMatch = text.match(/(?:NIK|N1K|N!K|NlK)\s*[:\.]?\s*([0-9XxLlOoIi]{16})/i) || text.match(/\b([0-9]{16})\b/);
  if (nikMatch) {
    result.nik = nikMatch[1].replace(/[Oo]/g, '0').replace(/[IiLl]/g, '1');
  }

  // 2. Nama
  const nameMatch = text.match(/Nama\s*[:\.]?\s*([^\n\r]+)/i);
  if (nameMatch) {
    const rawName = nameMatch[1].trim().replace(/[^a-zA-Z\s\.,'-]/g, '');
    result.nama = rawName;
    const parts = rawName.split(/\s+/).filter(Boolean);
    result.firstName = parts[0] || '';
    result.middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
    result.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
  }

  // 3. Tempat/Tgl Lahir (teks sebelum koma = Tempat Lahir, teks setelah koma = Tanggal Lahir)
  const dobMatch = text.match(/(?:Tempat|pat)?[/\s]*Tgl[a-z/\s]*Lahir\s*[:\.]?\s*([^\n\r]+)/i);
  if (dobMatch) {
    const parsed = parseBirthPlaceAndDate(dobMatch[1]);
    result.tempatLahir = parsed.place;
    result.tanggalLahir = parsed.date;
    result.dateOfBirth = parsed.date;
    result.tempatTglLahir = parsed.place + (parsed.date ? `, ${parsed.date}` : (parsed.rawDate ? `, ${parsed.rawDate}` : ''));
  } else {
    // Fallback: cari pola apapun yang mengandung [Kota/Wilayah], [Tanggal Lahir]
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

  // 4. Jenis Kelamin
  if (/Jenis\s*Kelamin.*(MALE|LAKI|PRIA)/i.test(text)) {
    result.gender = 'MALE';
  } else if (/Jenis\s*Kelamin.*(FEMALE|PEREMPUAN|WANITA)/i.test(text)) {
    result.gender = 'FEMALE';
  }

  // 5. Status Perkawinan
  if (/Status.*(MARRIED|KAWIN)/i.test(text)) {
    result.status = 'MARRIED';
    result.maritalStatus = 'MARRIED';
  } else if (/Status.*(SINGLE|BELUM KAWIN)/i.test(text)) {
    result.status = 'SINGLE';
    result.maritalStatus = 'SINGLE';
  }

  // 6. Kewarganegaraan
  const wargaMatch = text.match(/Kewarganegaraan\s*[:\.]?\s*([^\n\r]+)/i);
  if (wargaMatch) {
    const w = wargaMatch[1].trim().toUpperCase();
    result.kewarganegaraan = w;
    result.citizenship = (w.includes('WNI') || w.includes('INDONESIA')) ? 'WNI' : 'WNA';
  } else if (/WNA|CHINA|FOREIGN|MALAYSIA|SINGAPORE/i.test(text)) {
    result.kewarganegaraan = 'WNA';
    result.citizenship = 'WNA';
  } else if (/WNI|INDONESIA/i.test(text)) {
    result.kewarganegaraan = 'WNI';
    result.citizenship = 'WNI';
  }

  // 7. Alamat
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let alamatVal = '';
  const alamatMatch = text.match(/(?:Alamat|Alamal|Alama|Alanat)\s*[:.\-–—=~*+]*\s*([^\n\r]+)/i);
  if (alamatMatch) {
    let cand = alamatMatch[1].trim();
    cand = cand.replace(/^[:.\-–—=~*+\s]+/, '').trim();
    cand = cand.split(/\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA)\b/i)[0].trim();
    if (cand && cand.length >= 3 && !/^\d{1,3}\/\d{1,3}$/.test(cand)) {
      alamatVal = cand;
    }
  }

  // Fallback 1: check line immediately after Alamat label
  if (!alamatVal) {
    const alIdx = lines.findIndex(l => /^(?:Alamat|Alamal|Alama|Alanat)\b/i.test(l));
    if (alIdx !== -1 && alIdx + 1 < lines.length) {
      const nextLine = lines[alIdx + 1];
      if (!/^(?:RT|RW|Kel|Desa|Kecamatan|Agama|Status|NIK|Nama)/i.test(nextLine)) {
        let cand = nextLine.replace(/^[:.\-–—=~*+\s]+/, '').trim();
        cand = cand.split(/\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA)\b/i)[0].trim();
        if (cand && cand.length >= 3) alamatVal = cand;
      }
    }
  }

  // Fallback 2: look for street prefix lines
  if (!alamatVal) {
    const stLine = lines.find(l => /\b(?:JL|JALAN|KP|KAMPUNG|KOMP|KOMPLEK|GG|GANG|BLOK|DUSUN)\b/i.test(l) && !/^(?:PROVINSI|KOTA|KABUPATEN)/i.test(l));
    if (stLine) {
      let cand = stLine.replace(/^[:.\-–—=~*+\s]+/, '').trim();
      cand = cand.split(/\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA)\b/i)[0].trim();
      if (cand && cand.length >= 4) alamatVal = cand;
    }
  }

  if (alamatVal) {
    alamatVal = alamatVal.replace(/^[~*:\-–—\s]+/, '').replace(/[,.\s\-–—~*|]+$/, '').trim();
    result.alamat = alamatVal;
  }

  // 8. RT/RW
  const rtrwMatch = text.match(/(?:RT\s*[\/\.]?\s*RW|RT\s*RW|RTRW|RTAW)\s*[:.\-–—=~]*\s*([^\n\r]+)/i);
  if (rtrwMatch) {
    const raw = rtrwMatch[1].trim();
    const m = raw.match(/\b(\d{1,3})\s*[/,\-\\\|]\s*(\d{1,3})\b/);
    if (m) {
      result.rt = m[1].padStart(3, '0');
      result.rw = m[2].padStart(3, '0');
      result.rtRw = `${result.rt}/${result.rw}`;
    } else {
      const parts = raw.split(/[\/\-]/).map(s => s.trim().replace(/\D/g, ''));
      if (parts[0]) result.rt = parts[0].slice(0, 3).padStart(3, '0');
      if (parts[1]) result.rw = parts[1].slice(0, 3).padStart(3, '0');
      if (result.rt || result.rw) result.rtRw = `${result.rt || '000'}/${result.rw || '000'}`;
    }
  }

  // 9. Kel/Desa
  const kelMatch = text.match(/Kel\s*[\/\.]?\s*Desa\s*[:\.]?\s*([^\n\r]+)/i);
  if (kelMatch) {
    let kd = kelMatch[1].trim().replace(/^[~*:\-–—\s]+/, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
    result.kelDesa = kd;
  }

  // 10. Kecamatan
  const kecMatch = text.match(/Kecamatan\s*[:\.]?\s*([^\n\r]+)/i);
  if (kecMatch) {
    let kc = kecMatch[1].trim().replace(/^[~*:\-–—\s]+/, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
    result.kecamatan = kc;
  }

  // 11. Provinsi & Kota
  const provMatch = text.match(/PROVINSI\s+([^\n\r]+)/i);
  if (provMatch) result.province = provMatch[1].replace(/^[~*:\-–—\s]+/, '').trim();
  const kabMatch = text.match(/(?:KABUPATEN|KOTA)\s+([^\n\r]+)/i);
  if (kabMatch) result.cityRegency = kabMatch[1].replace(/^[~*:\-–—\s]+/, '').trim();

  // 12. Pekerjaan
  const pekMatch = text.match(/(?:Pekerjaan|Pekeriaan|Pekerlaan|Pekerjaon)\s*[:.\-–—=~]*\s*([^\n\r]+)/i);
  if (pekMatch) {
    let rawPek = pekMatch[1].trim().replace(/\b(KOTA|KABUPATEN|KAB\.|PROV|PROVINSI|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})\b.*$/i, '').trim();
    rawPek = rawPek.replace(/[^a-zA-Z0-9/\s\-]/g, '').trim().toUpperCase();
    const normClean = rawPek.replace(/[^A-Z]/g, '');
    if (normClean.includes('MAHASISWA') || normClean.includes('PELAJAR')) {
      result.pekerjaan = 'PELAJAR/MAHASISWA';
    } else if (normClean.includes('WIRASWASTA') || normClean.includes('WIRA')) {
      result.pekerjaan = 'WIRASWASTA';
    } else if (normClean.includes('KARYAWAN') && normClean.includes('SWASTA')) {
      result.pekerjaan = 'KARYAWAN SWASTA';
    } else if (normClean.includes('KARYAWAN') && (normClean.includes('BUMN') || normClean.includes('BUMD'))) {
      result.pekerjaan = 'KARYAWAN BUMN';
    } else if (normClean.includes('KARYAWAN')) {
      result.pekerjaan = 'KARYAWAN SWASTA';
    } else if (normClean.includes('PEGAWAI') || normClean.includes('PNS')) {
      result.pekerjaan = 'PEGAWAI NEGERI SIPIL';
    } else if (normClean.includes('RUMAH') && normClean.includes('TANGGA')) {
      result.pekerjaan = 'IBU RUMAH TANGGA';
    } else if (normClean.includes('BELUM') || normClean.includes('TIDAKBEKERJA')) {
      result.pekerjaan = 'BELUM/TIDAK BEKERJA';
    } else if (normClean.includes('BURUH')) {
      result.pekerjaan = 'BURUH HARIAN LEPAS';
    } else if (normClean.includes('PEDAGANG')) {
      result.pekerjaan = 'PEDAGANG';
    } else if (normClean.includes('PETANI') || normClean.includes('PEKEBUN')) {
      result.pekerjaan = 'PETANI/PEKEBUN';
    } else if (normClean.includes('PENSIUNAN')) {
      result.pekerjaan = 'PENSIUNAN';
    } else if (normClean.includes('DOKTER')) {
      result.pekerjaan = 'DOKTER';
    } else if (normClean.includes('GURU')) {
      result.pekerjaan = 'GURU';
    } else if (normClean.includes('DOSEN')) {
      result.pekerjaan = 'DOSEN';
    } else {
      result.pekerjaan = rawPek || 'LAINNYA';
    }
  }

  result.berlaku_hingga = 'SEUMUR HIDUP';

  return result;
}

export const GUOHUI_CHEN_TEXT = ``;

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

export async function extractKtpTextFromImage(fileOrInput: File | Blob | string, fileName?: string): Promise<ParsedKtpData> {
  try {
    const uploadPayload = new FormData();
    if (typeof fileOrInput === 'string') {
      if (fileOrInput.startsWith('data:')) {
        const b = dataUrlToBlob(fileOrInput);
        uploadPayload.append('file', b, fileName || 'ktp_scan.jpg');
      } else {
        uploadPayload.append('file', new Blob([fileOrInput]), fileName || 'ktp_scan.txt');
      }
    } else if (fileOrInput instanceof File) {
      uploadPayload.append('file', fileOrInput);
    } else if (fileOrInput instanceof Blob) {
      uploadPayload.append('file', fileOrInput, fileName || 'ktp_scan.jpg');
    }
    uploadPayload.append('doc_type', 'ktp');

    const res = await api('/ocr/scan', 'POST', uploadPayload);
    if (res && res.data) {
      const d = res.data;
      const rawLines: string[] = [];
      if (d.provinsi || d.province) rawLines.push(`PROVINSI ${String(d.provinsi || d.province).toUpperCase()}`);
      if (d.kabupaten_kota || d.cityRegency || d.city) rawLines.push(String(d.kabupaten_kota || d.cityRegency || d.city).toUpperCase());
      if (d.nik) rawLines.push(`NIK : ${d.nik}`);
      if (d.nama) rawLines.push(`Nama : ${d.nama}`);
      if (d.tempat_lahir || d.tanggal_lahir) {
        rawLines.push(`Tempat/Tgl Lahir : ${d.tempat_lahir || ''}${d.tanggal_lahir ? ', ' + d.tanggal_lahir : ''}`);
      }
      const genderStr = d.jenis_kelamin || (d.gender === 'FEMALE' ? 'PEREMPUAN' : 'LAKI-LAKI');
      rawLines.push(`Jenis Kelamin : ${genderStr}   Gol. Darah : ${d.golongan_darah || '-'}`);
      if (d.alamat || d.address || d.fullAddress) rawLines.push(`Alamat : ${d.alamat || d.address || d.fullAddress}`);
      if (d.rt_rw) rawLines.push(`RT/RW : ${d.rt_rw}`);
      if (d.kel_desa || d.village) rawLines.push(`Kel/Desa : ${d.kel_desa || d.village}`);
      if (d.kecamatan || d.district) rawLines.push(`Kecamatan : ${d.kecamatan || d.district}`);
      if (d.agama) rawLines.push(`Agama : ${d.agama}`);
      if (d.status_perkawinan || d.maritalStatus) rawLines.push(`Status Perkawinan : ${d.status_perkawinan || d.maritalStatus}`);
      if (d.pekerjaan || d.occupation) rawLines.push(`Pekerjaan : ${d.pekerjaan || d.occupation}`);
      if (d.kewarganegaraan) rawLines.push(`Kewarganegaraan : ${d.kewarganegaraan}`);
      rawLines.push(`Berlaku Hingga : ${d.berlaku_hingga || 'SEUMUR HIDUP'}`);

      const cleanNik = String(d.nik || d.idNumber || '').replace(/\D/g, '').slice(0, 16);
      const cleanNama = String(d.nama || '').trim();
      const parts = cleanNama ? cleanNama.split(/\s+/).filter(Boolean) : [];

      const parsedRes: ParsedKtpData = {
        nik: cleanNik || undefined,
        nama: cleanNama || undefined,
        firstName: d.firstName || (parts[0] || ''),
        middleName: d.middleName || (parts.length > 2 ? parts.slice(1, -1).join(' ') : ''),
        lastName: d.lastName || (parts.length > 1 ? parts[parts.length - 1] : ''),
        tempatLahir: d.tempat_lahir || undefined,
        tanggalLahir: d.tanggal_lahir || undefined,
        dateOfBirth: d.tanggal_lahir || undefined,
        tempatTglLahir: (d.tempat_lahir || '') + (d.tanggal_lahir ? `, ${d.tanggal_lahir}` : ''),
        gender: (d.gender === 'FEMALE' || String(d.jenis_kelamin).toUpperCase().includes('PEREMPUAN')) ? 'FEMALE' : 'MALE',
        golonganDarah: d.golongan_darah || undefined,
        status: (d.maritalStatus === 'MARRIED' || String(d.status_perkawinan).toUpperCase().includes('KAWIN')) ? 'MARRIED' : 'SINGLE',
        maritalStatus: (d.maritalStatus === 'MARRIED' || String(d.status_perkawinan).toUpperCase().includes('KAWIN')) ? 'MARRIED' : 'SINGLE',
        kewarganegaraan: d.kewarganegaraan || 'WNI',
        citizenship: String(d.kewarganegaraan || '').toUpperCase().includes('WNA') ? 'WNA' : 'WNI',
        alamat: d.alamat || d.address || d.fullAddress || undefined,
        rtRw: d.rt_rw || undefined,
        rt: d.rt || undefined,
        rw: d.rw || undefined,
        kelDesa: d.kel_desa || d.village || undefined,
        village: d.kel_desa || d.village || undefined,
        kecamatan: d.kecamatan || d.district || undefined,
        district: d.kecamatan || d.district || undefined,
        province: d.provinsi || d.province || undefined,
        cityRegency: d.kabupaten_kota || d.cityRegency || d.city || undefined,
        city: d.kabupaten_kota || d.cityRegency || d.city || undefined,
        kodePos: d.kode_pos || d.postalCode || undefined,
        postalCode: d.kode_pos || d.postalCode || undefined,
        agama: d.agama || undefined,
        pekerjaan: d.pekerjaan || d.occupation || undefined,
        berlaku_hingga: d.berlaku_hingga || 'SEUMUR HIDUP',
        rawText: rawLines.join('\n')
      };

      return parsedRes;
    }
  } catch (err) {
    console.warn('[KTP OCR] Remote OCR error, falling back to local text parsing if possible:', err);
  }

  // If input was raw text, attempt to parse it
  if (typeof fileOrInput === 'string' && !fileOrInput.startsWith('data:')) {
    return parseKtpText(fileOrInput);
  }

  return {
    rawText: ''
  };
}
