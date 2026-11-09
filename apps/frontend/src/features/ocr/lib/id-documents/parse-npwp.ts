/** NPWP OCR text → structured fields. */
import {normalizeBirthDate} from '@/shared/lib/dates';
import {ParsedNpwpData} from './types';

// -------------------------------------------------------------
// NPWP Parser
// -------------------------------------------------------------
export function parseNpwpText(text: string): ParsedNpwpData {
  const result: ParsedNpwpData = {rawText: text || ''};
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
  const nameMatch = text.match(
    /(?:nama\s*wajib\s*pajak|nama\s*wp|nama)[\s:.\-–—=~]*([A-Za-z0-9\s\.,\(\)'-]{3,50})(?:$|\n|nik|alamat)/i,
  );
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
