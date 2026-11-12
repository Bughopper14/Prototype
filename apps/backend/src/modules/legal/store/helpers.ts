/** Shared mappers and enum/alias resolvers for CRM legal deeds and stakeholders on crm_liugong1. */
import {ageFromDateOfBirth, storedDocumentUrl} from '@liugong/shared';
import {
  cleanNullableString,
  enumOrNull,
  normalizeCode,
  resolveLocationNames,
  resolveMasterCodeOrName,
} from '../../../core/db/crm-lookups';
import {dateStr} from '../../applications/intake/helpers';
import type {IdentityDocType, StoredIdentityRow} from '../../identity-documents/identity-documents.store';

export const REMARK_CATEGORY_ALIASES: Record<string, string> = {
  'establishment-deed': 'ESTABLISHMENT_DEED',
  ESTABLISHMENT_DEED: 'ESTABLISHMENT_DEED',
  'amendment-management': 'AMENDMENT_MANAGEMENT_CHANGE',
  'amendment-management-change': 'AMENDMENT_MANAGEMENT_CHANGE',
  AMENDMENT_MANAGEMENT_CHANGE: 'AMENDMENT_MANAGEMENT_CHANGE',
  'amendment-articles': 'AMENDMENT_ARTICLES_CHANGE',
  'amendment-articles-change': 'AMENDMENT_ARTICLES_CHANGE',
  AMENDMENT_ARTICLES_CHANGE: 'AMENDMENT_ARTICLES_CHANGE',
  'amendment-share': 'AMENDMENT_SHARE_CHANGE',
  'amendment-share-change': 'AMENDMENT_SHARE_CHANGE',
  AMENDMENT_SHARE_CHANGE: 'AMENDMENT_SHARE_CHANGE',
  'amendment-business': 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE',
  'amendment-business-activity': 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE',
  'amendment-business-activity-change': 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE',
  AMENDMENT_BUSINESS_ACTIVITY_CHANGE: 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE',
  'amendment-other': 'AMENDMENT_OTHER',
  AMENDMENT_OTHER: 'AMENDMENT_OTHER',
};

export function normalizeRemarkCategoryCode(raw: unknown): string {
  const s = cleanNullableString(raw);
  if (!s) return '';
  return REMARK_CATEGORY_ALIASES[s] || REMARK_CATEGORY_ALIASES[s.toLowerCase()] || normalizeCode(s);
}

export function normalizeIdType(raw: unknown): 'KTP_NPWP' | 'PASSPORT_KITAS' | null {
  const s = cleanNullableString(raw);
  if (!s) return null;
  const up = normalizeCode(s);
  if (up === 'KTP_NPWP' || up === 'KTP' || up === 'NPWP') return 'KTP_NPWP';
  if (up === 'PASSPORT_KITAS' || up === 'PASSPORT' || up === 'KITAS' || up === 'EKITAS') return 'PASSPORT_KITAS';
  return null;
}

export function normalizeCitizenship(raw: unknown): 'INDONESIAN' | 'FOREIGN' {
  const up = normalizeCode(raw);
  if (up === 'FOREIGN' || up === 'WNA') return 'FOREIGN';
  return 'INDONESIAN';
}

export function splitFullName(s: any) {
  const first = cleanNullableString(s?.firstName);
  const middle = cleanNullableString(s?.middleName);
  const last = cleanNullableString(s?.lastName);
  if (first || middle || last) {
    return {
      firstName: first?.slice(0, 100) ?? null,
      middleName: middle?.slice(0, 100) ?? null,
      lastName: last?.slice(0, 100) ?? null,
    };
  }
  const full = cleanNullableString(s?.name || s?.fullName);
  if (!full) return {firstName: null, middleName: null, lastName: null};
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return {firstName: parts[0].slice(0, 100), middleName: null, lastName: null};
  if (parts.length === 2) return {firstName: parts[0].slice(0, 100), middleName: null, lastName: parts[1].slice(0, 100)};
  return {
    firstName: parts[0].slice(0, 100),
    middleName: parts.slice(1, -1).join(' ').slice(0, 100),
    lastName: parts[parts.length - 1].slice(0, 100),
  };
}

export async function mapStakeholder(
  row: any,
  db?: any,
  ocrDocs?: Partial<Record<IdentityDocType, StoredIdentityRow>> | null,
) {
  const [loc, representativeType, position, designation] = await Promise.all([
    resolveLocationNames(row, db),
    resolveMasterCodeOrName('crm_master_legal_representative_types', row.representative_type_id, 'code', db),
    resolveMasterCodeOrName('crm_master_stakeholder_positions', row.position_id, 'code', db),
    resolveMasterCodeOrName('crm_master_legal_designations', row.designation_id, 'code', db),
  ]);

  const dob = dateStr(row.date_of_birth) || '';
  const age = dob ? ageFromDateOfBirth(dob) : null;
  const fullName = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ').trim();
  const citizenship = row.citizenship || 'INDONESIAN';

  const docMeta: Record<string, any> = {};
  const resolvedUrls: Partial<Record<IdentityDocType, {url: string; path: string; name: string}>> = {};
  for (const t of ['ktp', 'npwp', 'passport', 'kitas'] as IdentityDocType[]) {
    const rec = ocrDocs?.[t];
    if (!rec) continue;
    const rawPath = rec.document_path || (rec.file_name ? `/documents/${t}/${rec.file_name}` : '');
    const url = storedDocumentUrl(rawPath);
    if (!url) continue;
    resolvedUrls[t] = {url, path: rawPath, name: rec.file_name || ''};
    docMeta[`${t}Url`] = url;
    docMeta[`${t}DocumentPath`] = rawPath;
    if (rec.file_name) docMeta[`${t}FileName`] = rec.file_name;
    docMeta[`${t}OcrId`] = rec.id;
    if (rec.ocr_data) {
      docMeta[`${t}Data`] = rec.ocr_data;
    }
  }

  const order: IdentityDocType[] = String(row.id_type || '').toUpperCase().startsWith('PASSPORT')
    ? ['passport', 'kitas', 'ktp', 'npwp']
    : ['ktp', 'npwp', 'passport', 'kitas'];
  const primaryDoc = order.map(t => resolvedUrls[t]).find(Boolean) || null;

  return {
    id: row.id,
    deedId: row.deed_id,
    applicationId: row.application_id,
    stakeholderType: row.stakeholder_type || 'INDIVIDUAL',
    type: row.stakeholder_type || 'INDIVIDUAL',
    representativeType: representativeType || '',
    position: position || '',
    designation: designation || '',
    isSignatory: row.is_signatory || '',
    idType: row.id_type || '',
    idNumber: row.id_number || '',
    idNumberSecondary: row.id_number_secondary || '',
    title: row.title || '',
    firstName: row.first_name || '',
    middleName: row.middle_name || '',
    lastName: row.last_name || '',
    name: fullName,
    dateOfBirth: dob,
    ageYears: age ? age.ageYears : (row.age_years ?? ''),
    ageMonths: age ? age.ageMonths : (row.age_months ?? ''),
    maritalStatus: row.marital_status || '',
    occupation: row.occupation || '',
    email: row.email || '',
    mobilePhone: row.mobile_phone || '',
    gender: row.gender || '',
    sharePercentage: Number(row.share_percentage ?? 0),
    depositedCapital: row.deposited_capital !== null && row.deposited_capital !== undefined ? Number(row.deposited_capital) : '',
    primaryCapital: row.primary_capital !== null && row.primary_capital !== undefined ? Number(row.primary_capital) : '',
    citizenship,
    nationalityType: citizenship === 'FOREIGN' ? 'WNA' : 'WNI',
    country: loc.country || (citizenship === 'INDONESIAN' ? 'Indonesia' : ''),
    province: loc.province || '',
    city: loc.city || '',
    cityRegency: loc.city || '',
    district: loc.district || '',
    village: loc.village || '',
    postalCode: loc.postalCode || '',
    postalZip: loc.postalCode || '',
    foreignRegionText: row.foreign_region_text || '',
    rt: row.rt || '',
    rw: row.rw || '',
    address: row.address || '',
    isInherited: Boolean(row.is_inherited),
    sourceDeedId: row.source_deed_id || '',
    ...docMeta,
    ...(primaryDoc
      ? {fileUrl: primaryDoc.url, document_path: primaryDoc.path, file_name: primaryDoc.name}
      : {}),
  };
}

export const enumClean = enumOrNull;
