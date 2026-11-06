/** Passport OCR text (incl. MRZ) → structured fields. */
import {normalizeBirthDate} from '@/shared/lib/dates';
import {ParsedPassportData} from './types';

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
  const result: ParsedPassportData = {rawText: text || ''};
  if (!text) return result;

  // Passport number pattern (e.g. A12345678, C12345678, E12345678)
  const pMatch =
    text.match(/(?:passport\s*no\.?|paspor\s*no\.?|no\.?\s*paspor)[\s:.\-–—]*([A-Z0-9]{7,10})/i) ||
    text.match(/\b([A-Z][0-9]{7,8})\b/i);
  if (pMatch) result.passportNumber = pMatch[1].toUpperCase();

  // Country Code / Name
  const cMatch =
    text.match(/(?:country\s*code|kode\s*negara)[\s:.\-–—]*([A-Z]{3})\b/i) ||
    text.match(/\b(IDN|CHN|USA|MYS|SGP|JPN|KOR|AUS|GBR|DEU|FRA)\b/i);
  if (cMatch) {
    result.countryCode = cMatch[1].toUpperCase();
    const mapName: Record<string, string> = {
      IDN: 'INDONESIA',
      CHN: 'CHINA',
      MYS: 'MALAYSIA',
      SGP: 'SINGAPORE',
      USA: 'UNITED STATES',
    };
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
  const expMatch = text.match(
    /(?:date\s*of\s*expiry|berlaku\s*sampai|expiry\s*date)[\s:.\-–—=~]*([^\n\r]+)/i,
  );
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
