export function normalizeStakeholderIdType(
  rawType: string | undefined,
  s?: any,
): 'NONE' | 'KTP_NPWP' | 'PASSPORT_KITAS' {
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
  return 'NONE';
}

/** Value stored in the address fields of a foreign (PASSPORT - KITAS) stakeholder. */
export const FOREIGN_REGION_VALUE = 'Others';
/**
 * Address fields set to "Others" for a foreign stakeholder, Country included: which
 * countries count is not decided yet, so no country list is offered for now.
 */
export const FOREIGN_REGION_KEYS = [
  'country',
  'province',
  'cityRegency',
  'district',
  'village',
  'rt',
  'rw',
  'postalCode',
];

/** Foreign citizen identified by PASSPORT - KITAS: the address is "Others" from Country onward. */
export function isForeignAddress(s: any) {
  return s?.citizenship === 'FOREIGN' && normalizeStakeholderIdType(s.idType, s) === 'PASSPORT_KITAS';
}

/**
 * "Others" is only a default: the fields stay editable. It is filled when the stakeholder
 * becomes foreign (overwriting the Indonesian address), and undone when switching back.
 * Without `prev` (a record just opened), only empty fields are filled, so saved edits are kept.
 */
export function applyForeignAddress(s: any, prev?: any) {
  if (!s) return s;
  const foreignNow = isForeignAddress(s);
  const foreignBefore = prev ? isForeignAddress(prev) : !foreignNow;
  if (foreignNow === foreignBefore) return s; // no switch: keep whatever the user typed
  const next = {...s};
  if (foreignNow) {
    for (const k of FOREIGN_REGION_KEYS)
      if (prev || !String(next[k] ?? '').trim()) next[k] = FOREIGN_REGION_VALUE;
  } else {
    // Switching back clears the foreign address (typed values don't fit the Indonesian lists);
    // a record just opened only loses leftover "Others"
    for (const k of FOREIGN_REGION_KEYS) if (prev || next[k] === FOREIGN_REGION_VALUE) next[k] = '';
    if (next.citizenship === 'INDONESIAN' && !/^indonesia$/i.test(String(next.country || '').trim()))
      next.country = 'Indonesia';
  }
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
    representativeType: s.representativeType || 'NONE',
    signatory: s.signatory || 'NONE',
    idType: resolvedIdType,
    idNumberSecondary,
    title: s.title || 'NONE',
    firstName: s.firstName || parts[0] || '',
    middleName: s.middleName || parts.slice(1, -1).join(' '),
    lastName: s.lastName || (parts.length > 1 ? parts.at(-1) : ''),
    maritalStatus: s.maritalStatus || 'NONE',
    designation: s.designation || s.position || 'NONE',
    email: s.email || '',
    mobilePhone: s.mobilePhone || '',
    gender: s.gender || 'NONE',
    sharePercentage: s.sharePercentage ?? 0,
    depositedCapital: s.depositedCapital ?? s.shareAmount ?? 0,
    primaryCapital: s.primaryCapital ?? 0,
    citizenship: s.citizenship || (s.nationalityType === 'WNA' ? 'FOREIGN' : 'INDONESIAN'),
    country: s.country || 'Indonesia',
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
        : rawIdType === 'NONE'
          ? 'NONE'
          : 'NONE';
  return {
    ...s,
    name,
    position: s.designation && s.designation !== 'NONE' ? s.designation : s.position || 'Shareholder',
    nationalityType: s.citizenship === 'FOREIGN' ? 'WNA' : 'WNI',
    idType,
    idNumber: s.idNumber || s.nik || s.passportNumber || '',
    idNumberSecondary: s.idNumberSecondary || s.taxId || s.npwp || s.permitNumber || '',
    taxNumber: s.idNumberSecondary || s.taxId || s.npwp || null,
    email: s.email || 'shareholder@liugong.local',
    mobilePhone: s.mobilePhone || '08123456789',
    primaryCapital:
      s.primaryCapital !== undefined && s.primaryCapital !== null && s.primaryCapital !== ''
        ? s.primaryCapital
        : (s.depositedCapital ?? s.shareAmount ?? 0),
    shareAmount: s.depositedCapital ?? 0,
    sharePercentage: s.sharePercentage ?? 0,
  };
}
