import {normalizeBirthDate} from '@/lib/ktp-ocr';

export const statusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED_TO_BS: 'BS verification',
  BS_VERIFIED: 'BS verified',
  IN_CA_LEGAL_REVIEW: 'CA & Legal review',
  CREDIT_COMMITTEE_REVIEW: 'Committee review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RETURNED: 'Returned',
};

export const money = (n: any, compact = false) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    ...(compact ? {notation: 'compact' as const} : {}),
  })
    .format(Number(n) || 0)
    .replace('IDR', 'Rp');

export const date = (d: any) =>
  d ? new Date(d).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : '—';

export function calculateAgeYearsMonths(dobString?: string | null): {years: number; months: number} {
  if (!dobString) return {years: 0, months: 0};
  const normalized = normalizeBirthDate(dobString) || String(dobString).slice(0, 10);
  const parts = normalized.split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => isNaN(n) || n === 0)) return {years: 0, months: 0};
  const [y, m, d] = parts;
  const dob = new Date(y, m - 1, d);
  if (isNaN(dob.getTime())) return {years: 0, months: 0};
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  if (today.getDate() < dob.getDate()) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return {years: Math.max(0, years), months: Math.max(0, months)};
}
/** Derive synced deed fields from legal.deeds list.
 *  - establishmentActNo / establishmentDate  → from establishment deed (type='establishment')
 *  - latestDeedNo / latestDeedDate           → from latest deed (most recent amendment, or establishment if no amendment)
 *  - experienceYears / experienceMonths       → today - establishmentDate
 */

export function deriveDeedSync(
  legal: any,
  application?: any,
): {
  establishmentActNo: string;
  establishmentDate: string;
  latestDeedNo: string;
  latestDeedDate: string;
  experienceYears: number;
  experienceMonths: number;
} {
  const deeds: any[] = Array.isArray(legal?.deeds) ? legal.deeds : [];
  // establishment deed
  const estDeed = deeds.find((d: any) => d.type === 'establishment');
  const estActNo = estDeed?.deedNumber || application?.customer?.establishmentActNo || '';
  const estDateRaw = estDeed?.deedDate || application?.customer?.establishmentDate || '';
  const estDate = String(estDateRaw || '').slice(0, 10);
  // latest deed: most recent amendment by deedDate, fallback to establishment
  const amendments = deeds.filter((d: any) => d.type === 'amendment' && d.deedDate);
  const latestAmendment = amendments.sort((a: any, b: any) =>
    String(b.deedDate).localeCompare(String(a.deedDate)),
  )[0];
  const latestDeed = latestAmendment || estDeed;
  const latestNo = latestDeed?.deedNumber || application?.latestDeedNo || '';
  const latestDate = String(latestDeed?.deedDate || '').slice(0, 10) || application?.latestDeedDate || '';
  // experience from establishment date
  const {years, months} = calculateAgeYearsMonths(estDate);
  return {
    establishmentActNo: estActNo,
    establishmentDate: estDate,
    latestDeedNo: latestNo,
    latestDeedDate: latestDate,
    experienceYears: years,
    experienceMonths: months,
  };
}

export function deedValidity(deedDate: any) {
  if (!deedDate) return {status: 'Date not filled', active: null, expiry: null};
  const parts = String(deedDate).slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(x => !x))
    return {status: 'Date not filled', active: null, expiry: null};
  const expiry = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(expiry.getTime())) return {status: 'Date not filled', active: null, expiry: null};
  expiry.setFullYear(expiry.getFullYear() + 5);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const active = today <= expiry;
  return {status: active ? 'Active' : 'Inactive', active, expiry};
}
