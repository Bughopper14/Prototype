/** Indonesian / English month names and abbreviations → two-digit month number. */
export const INDO_MONTH_MAP: Record<string, string> = {
  JAN: '01',
  JANUARI: '01',
  JANUARY: '01',
  FEB: '02',
  FEBRUARI: '02',
  FEBRUARY: '02',
  MAR: '03',
  MARET: '03',
  MARCH: '03',
  APR: '04',
  APRIL: '04',
  MEI: '05',
  MAY: '05',
  JUN: '06',
  JUNI: '06',
  JUNE: '06',
  JUL: '07',
  JULI: '07',
  JULY: '07',
  AGU: '08',
  AGT: '08',
  AGUSTUS: '08',
  AUG: '08',
  AUGUST: '08',
  SEP: '09',
  SEPTEMBER: '09',
  OKT: '10',
  OCT: '10',
  OKTOBER: '10',
  OCTOBER: '10',
  NOV: '11',
  NOP: '11',
  NOVEMBER: '11',
  DES: '12',
  DEC: '12',
  DESEMBER: '12',
  DECEMBER: '12',
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
