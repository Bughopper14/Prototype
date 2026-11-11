/** KTP OCR text → structured fields (NIK, name, birth place/date, address…). */
import {normalizeBirthDate, toDmyDate} from '@/shared/lib/dates';
import {extractStreetAddress} from '@liugong/shared';
import {ParsedKtpData} from './types';

export function parseBirthPlaceAndDate(rawStr?: string | null): {
  place: string;
  date: string;
  rawDate: string;
} {
  if (!rawStr) return {place: '', date: '', rawDate: ''};
  let cleaned = String(rawStr)
    .replace(/^(?:tempat|pat)?[/\s]*tgl[a-z/\s]*lahir\s*[:.,\-–\uff1a]?\s*/i, '')
    .trim();
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

  place = place
    .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9\s]+$/g, '')
    .trim()
    .toUpperCase();
  const dateDmy = toDmyDate(rawDate) || normalizeBirthDate(rawDate);
  return {place, date: dateDmy, rawDate};
}

export function splitPersonName(fullName: string) {
  const parts = String(fullName || '')
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);
  return {
    firstName: parts[0] || '',
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
    lastName: parts.length > 1 ? parts[parts.length - 1] : '',
  };
}

// -------------------------------------------------------------
// KTP Parser (Adopted from robust NIB line & window token logic)
// -------------------------------------------------------------
export function parseKtpText(text: string): ParsedKtpData {
  const result: ParsedKtpData = {rawText: text || ''};
  if (!text) return result;

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  // 1. NIK (16 digit angka with OCR correction)
  const cleanNikStr = (s: string) => {
    let res = s.toUpperCase();
    res = res
      .replace(/O/g, '0')
      .replace(/D/g, '0')
      .replace(/[IL]/g, '1')
      .replace(/B/g, '8')
      .replace(/S/g, '5')
      .replace(/Z/g, '2');
    return res.replace(/\D/g, '');
  };

  const nikMatch =
    text.match(/(?:NIK|N1K|N!K|NlK|Nomor\s*Induk)\s*[:.\-–—]*\s*([0-9A-Za-z\s]{14,22})/i) ||
    text.match(/\b([0-9]{16})\b/);
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
  if (provMatch)
    result.province = provMatch[1]
      .replace(/^[~*:\-–—\s]+/, '')
      .trim()
      .toUpperCase();
  const kabMatch = text.match(/(?:KABUPATEN|KOTA)\s+([^\n\r]+)/i);
  if (kabMatch)
    result.cityRegency = kabMatch[1]
      .replace(/^[~*:\-–—\s]+/, '')
      .trim()
      .toUpperCase();
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
    result.tanggalLahir = toDmyDate(parsed.date || parsed.rawDate);
    result.dateOfBirth = result.tanggalLahir;
    result.tempatTglLahir =
      parsed.place + (result.tanggalLahir ? `, ${result.tanggalLahir}` : parsed.rawDate ? `, ${parsed.rawDate}` : '');
  } else {
    const commaDateMatch = text.match(
      /([a-zA-Z\s]{3,20})\s*,\s*(\d{1,2}[-\s/\.]+[A-Za-z]+[-\s/\.]+\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})/,
    );
    if (commaDateMatch) {
      const parsed = parseBirthPlaceAndDate(commaDateMatch[0]);
      if (parsed.place) result.tempatLahir = parsed.place;
      const dmy = toDmyDate(parsed.date || parsed.rawDate);
      if (dmy) {
        result.tanggalLahir = dmy;
        result.dateOfBirth = dmy;
        result.tempatTglLahir = `${parsed.place}, ${dmy}`;
      }
    }
  }

  // Fallback to NIK-encoded DOB if missing or invalid
  if (
    (!result.tanggalLahir || result.tanggalLahir.includes('-00-') || result.tanggalLahir.endsWith('-2018') || result.tanggalLahir.startsWith('2018-')) &&
    result.nik
  ) {
    const cNik = result.nik.replace(/\D/g, '');
    if (cNik.length >= 14) {
      const dobSlice = cNik.slice(-10, -4);
      let d = parseInt(dobSlice.slice(0, 2), 10);
      const m = parseInt(dobSlice.slice(2, 4), 10);
      const y = parseInt(dobSlice.slice(4, 6), 10);
      if (d > 40) d -= 40;
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        const fullY = 2000 + y <= 2015 ? 2000 + y : 1900 + y;
        result.tanggalLahir = `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${fullY}`;
        result.dateOfBirth = result.tanggalLahir;
      }
    }
  }

  if (result.tempatLahir) {
    let tl = result.tempatLahir.trim().toUpperCase();
    if (tl.startsWith('JAK') || tl.includes('JAKARTA') || tl.includes('JAKALA')) {
      tl = 'JAKARTA';
    }
    result.tempatLahir = tl;
    if (result.tanggalLahir) {
      result.tempatTglLahir = `${tl}, ${result.tanggalLahir}`;
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
      cand = cand.split(/\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA|KEC|KECAMATAN|KAB|KABUPATEN|KOTA|PROVINSI)\b/i)[0].trim();
      if (cand && cand.length >= 3 && !/^\d{1,3}\/\d{1,3}$/.test(cand)) {
        result.alamat = cand.toUpperCase();
        break;
      }
    }
  }
  if (!result.alamat) {
    const stLine = lines.find(
      l =>
        /\b(?:JL|JALAN|KP|KAMPUNG|KOMP|KOMPLEK|GG|GANG|BLOK|DUSUN)\b/i.test(l) &&
        !/^(?:PROVINSI|KOTA|KABUPATEN)/i.test(l),
    );
    if (stLine) {
      let cand = stLine.replace(/^[:.\-–—=~*+\s]+/, '').trim();
      cand = cand.split(/\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA|KEC|KECAMATAN|KAB|KABUPATEN|KOTA|PROVINSI)\b/i)[0].trim();
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
  const kelMatch = text.match(
    /(?:Kel\s*[\/\.]?\s*Desa|Kelurahan|Desa)\s*[:.\-–—=~]*\s*([A-Za-z0-9\s]+?)(?:$|\n|Kecamatan|RT|RW)/i,
  );
  if (kelMatch) {
    result.kelDesa = kelMatch[1]
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .toUpperCase();
    result.village = result.kelDesa;
  }

  // 9. Kecamatan
  const kecMatch = text.match(
    /(?:Kecamatan|Kec\.?)\s*[:.\-–—=~]*\s*([A-Za-z0-9\s]+?)(?:$|\n|Kabupaten|Kota|Agama)/i,
  );
  if (kecMatch) {
    result.kecamatan = kecMatch[1]
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .toUpperCase();
    result.district = result.kecamatan;
  }

  // 9b. Kode Pos
  const kpMatch = text.match(/(?:KODE\s*POS|KODEPOS|POSTAL\s*CODE)\s*[:.\-–—=~]*\s*(\d{5})\b/i);
  if (kpMatch) {
    result.kodePos = kpMatch[1];
    result.postalCode = result.kodePos;
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
  if (
    /\b(?:BELUM|TIDAK)\b/i.test(statusText) ||
    /\bBELUM\s*KAWIN\b/i.test(text) ||
    /\bSINGLE\b/i.test(text)
  ) {
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
  if (result.alamat) {
    result.streetAddress = extractStreetAddress(result.alamat, result);
  }
  return result;
}
