/** KITAS OCR text → structured fields. */
import {normalizeBirthDate} from '@/shared/lib/dates';
import {ParsedKitasData} from './types';

// -------------------------------------------------------------
// KITAS / ITAS Parser
// -------------------------------------------------------------
export function parseKitasText(text: string): ParsedKitasData {
  const result: ParsedKitasData = {rawText: text || ''};
  if (!text) return result;

  // Permit No / No Izin Tinggal
  const pMatch = text.match(
    /(?:izin\s*tinggal|permit\s*no\.?|kitas\s*no\.?|itas\s*no\.?)[\s:.\-–—]*([A-Za-z0-9\/\-]{8,25})/i,
  );
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
