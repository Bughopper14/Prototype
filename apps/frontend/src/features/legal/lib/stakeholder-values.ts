import {currentMasterData} from '@/shared/master-data';
import {FOREIGN_REGION_KEYS, FOREIGN_REGION_VALUE} from '@liugong/shared';

export function normalizeStakeholderIdType(
  rawType: string | undefined,
  s?: any,
): '' | 'KTP_NPWP' | 'PASSPORT_KITAS' {
  const t = String(rawType || '')
    .toUpperCase()
    .trim();
  if (t === 'KTP_NPWP' || t === 'PASSPORT_KITAS') return t;
  if (['KTP', 'NPWP'].includes(t)) return 'KTP_NPWP';
  if (['PASSPORT', 'KITAS'].includes(t)) return 'PASSPORT_KITAS';
  if (s) {
    if (s.passportUrl || s.passportOcrText || s.kitasUrl || s.kitasOcrText) return 'PASSPORT_KITAS';
    if (s.ktpUrl || s.ktpOcrText || s.npwpUrl || s.npwpOcrText) return 'KTP_NPWP';
    if (s.nationalityType === 'WNA' || s.citizenship === 'FOREIGN') return 'PASSPORT_KITAS';
  }
  return '';
}

export {FOREIGN_REGION_VALUE, FOREIGN_REGION_KEYS};

/** Foreign citizen identified by PASSPORT - KITAS: the address is "Others" from Country onward. */
export function isForeignAddress(s: any) {
  return s?.citizenship === 'FOREIGN' && normalizeStakeholderIdType(s.idType, s) === 'PASSPORT_KITAS';
}

/**
 * A foreign stakeholder (PASSPORT - KITAS) always has "Others" from Country to ZIP, and the
 * fields are locked: this runs on every change, so OCR, old records and typing cannot leave
 * another value there. When the stakeholder stops being foreign the "Others" values are cleared.
 */
export function applyForeignAddress(s: any, prev?: any) {
  if (!s) return s;
  if (isForeignAddress(s)) {
    if (FOREIGN_REGION_KEYS.every(k => s[k] === FOREIGN_REGION_VALUE)) return s;
    const next = {...s};
    for (const k of FOREIGN_REGION_KEYS) next[k] = FOREIGN_REGION_VALUE;
    return next;
  }
  const wasForeign = prev ? isForeignAddress(prev) : false;
  if (!wasForeign && !FOREIGN_REGION_KEYS.some(k => s[k] === FOREIGN_REGION_VALUE)) return s;
  const next = {...s};
  for (const k of FOREIGN_REGION_KEYS) if (next[k] === FOREIGN_REGION_VALUE) next[k] = '';
  return next;
}

export function stakeholderEditorValues(s: any) {
  const parts = String(s.name || '')
    .trim()
    .split(/\s+/);
  const resolvedIdType = normalizeStakeholderIdType(s.idType, s);
  const idNumberSecondary = s.idNumberSecondary || s.taxId || s.npwp || s.permitNumber || s.niora || '';
  return {
    ...s,
    positions: s.positions || '',
    representativeType: s.representativeType || '',
    signatory: s.signatory || '',
    idType: resolvedIdType,
    idNumberSecondary,
    title: s.title || '',
    firstName: s.firstName || parts[0] || '',
    middleName: s.middleName || parts.slice(1, -1).join(' '),
    lastName: s.lastName || (parts.length > 1 ? parts.at(-1) : ''),
    maritalStatus: s.maritalStatus || '',
    designation: s.designation || s.position || '',
    email: s.email || '',
    mobilePhone: s.mobilePhone || '',
    gender: s.gender || '',
    sharePercentage: s.sharePercentage ?? 0,
    depositedCapital: s.depositedCapital ?? s.shareAmount ?? 0,
    primaryCapital: s.primaryCapital ?? 0,
    citizenship: s.citizenship || (s.nationalityType === 'WNA' ? 'FOREIGN' : 'INDONESIAN'),
    country: s.country || '',
  };
}

export function stakeholderForSave(s: any) {
  const first = s.firstName || '',
    last = s.lastName || '',
    name =
      [first, s.middleName, last]
        .map((x: string) => String(x || '').trim())
        .filter(Boolean)
        .join(' ') ||
      s.name ||
      '';
  const rawIdType = String(s.idType || '')
    .toUpperCase()
    .trim();
  const idType =
    rawIdType === 'PASSPORT_KITAS' || ['PASSPORT', 'KITAS'].includes(rawIdType)
      ? 'PASSPORT_KITAS'
      : rawIdType === 'KTP_NPWP' || ['KTP', 'NPWP'].includes(rawIdType)
        ? 'KTP_NPWP'
        : '';
  return {
    ...s,
    name,
    positions: s.positions || null,
    // Display name of the position (crm_master_stakeholder_positions)
    position: (currentMasterData().positions || []).find(p => p.value === s.positions)?.name || '',
    nationalityType: s.citizenship === 'FOREIGN' ? 'WNA' : 'WNI',
    idType,
    idNumber: s.idNumber || s.nik || s.passportNumber || '',
    idNumberSecondary: s.idNumberSecondary || s.taxId || s.npwp || s.permitNumber || '',
    taxNumber: s.idNumberSecondary || s.taxId || s.npwp || null,
    email: s.email || '',
    mobilePhone: s.mobilePhone || '',
    primaryCapital:
      s.primaryCapital !== undefined && s.primaryCapital !== null && s.primaryCapital !== ''
        ? s.primaryCapital
        : (s.depositedCapital ?? s.shareAmount ?? 0),
    shareAmount: s.depositedCapital ?? 0,
    sharePercentage: s.sharePercentage ?? 0,
  };
}
