/** Form field key → FAP sheet cell id, used to highlight the cell being edited. */

export const FIELD_TO_CELL_ID_MAP: Record<string, string> = {
  // Application / Header
  applicationDate: 'fap-cell-applicationDate',
  branchCode: 'fap-cell-branchCode',
  fapNumber: 'fap-cell-fapNumber',
  customerStatus: 'fap-cell-custNew',
  companyType: 'fap-cell-corporate',
  industrySegment: 'fap-cell-corporate',

  // Company Information
  companyName: 'fap-cell-companyName',
  address: 'fap-cell-companyAddress',
  companyAddress: 'fap-cell-companyAddress',
  city: 'fap-cell-city',
  province: 'fap-cell-province',
  postalCode: 'fap-cell-postalCode',
  district: 'fap-cell-city',
  village: 'fap-cell-city',
  rt: 'fap-cell-city',
  rw: 'fap-cell-city',
  phoneFax: 'fap-cell-phoneFax',
  website: 'fap-cell-website',
  email: 'fap-cell-email',
  repaymentSource: 'fap-cell-repaymentSource',
  locationStatus: 'fap-cell-locationStatus',

  // Line of Business & Legal Deeds
  mainBusiness: 'fap-cell-mainBusiness',
  establishmentActNo: 'fap-cell-establishmentActNo',
  establishmentDate: 'fap-cell-establishmentDate',
  experienceYears: 'fap-cell-experienceYears',
  experienceMonths: 'fap-cell-experienceMonths',
  latestDeedNo: 'fap-cell-latestDeedNo',
  latestDeedDate: 'fap-cell-latestDeedDate',
  nib: 'fap-cell-nib',
  nibDate: 'fap-cell-nib',
  npwp: 'fap-cell-npwp',
  sktNo: 'fap-cell-npwp',
  sppkpNo: 'fap-cell-npwp',

  // PIC Information
  picName: 'fap-cell-picName',
  name: 'fap-cell-picName',
  phone: 'fap-cell-phone',
  mobilePhone: 'fap-cell-phone',
  position: 'fap-cell-position',
  picEmail: 'fap-cell-picEmail',
  currentAddress: 'fap-cell-currentAddress',
  picCity: 'fap-cell-picCity',
  picProvince: 'fap-cell-picProvince',
  picPostalCode: 'fap-cell-picPostalCode',

  // Projects
  projectOwner: 'fap-cell-proj-0-owner',
  projectLocation: 'fap-cell-proj-0-loc',
  location: 'fap-cell-proj-0-loc',
  projectRole: 'fap-cell-proj-0-role',
  roleInProject: 'fap-cell-proj-0-role',
  contractStatus: 'fap-cell-proj-0-status',

  // Shareholders
  shareholders: 'fap-cell-sh-0-name',
  sharePercentage: 'fap-cell-sh-0-pct',
  primaryCapital: 'fap-cell-sh-0-shares',
  depositedCapital: 'fap-cell-sh-0-shares',
};

export function resolveFieldToCellId(fieldKey: string, section?: string | null, extraData?: any): string {
  if (
    section?.startsWith('projects') ||
    [
      'projectOwner',
      'projectLocation',
      'location',
      'projectRole',
      'roleInProject',
      'contractStatus',
    ].includes(fieldKey)
  ) {
    let rowIndex = 0;
    const m = section?.match(/projects-(\d+)/);
    if (m) rowIndex = parseInt(m[1], 10) || 0;
    if (rowIndex > 6) rowIndex = 6;
    if (fieldKey === 'projectOwner') return `fap-cell-proj-${rowIndex}-owner`;
    if (fieldKey === 'projectLocation' || fieldKey === 'location') return `fap-cell-proj-${rowIndex}-loc`;
    if (fieldKey === 'projectRole' || fieldKey === 'roleInProject') return `fap-cell-proj-${rowIndex}-role`;
    if (fieldKey === 'contractStatus') return `fap-cell-proj-${rowIndex}-status`;
    return `fap-cell-proj-${rowIndex}-owner`;
  }
  if (section === 'pic' || section === 'fap-preview-sec-pic') {
    const picMap: Record<string, string> = {
      name: 'fap-cell-picName',
      picName: 'fap-cell-picName',
      phone: 'fap-cell-phone',
      mobilePhone: 'fap-cell-phone',
      position: 'fap-cell-position',
      email: 'fap-cell-picEmail',
      picEmail: 'fap-cell-picEmail',
      currentAddress: 'fap-cell-currentAddress',
      address: 'fap-cell-currentAddress',
      city: 'fap-cell-picCity',
      picCity: 'fap-cell-picCity',
      province: 'fap-cell-picProvince',
      picProvince: 'fap-cell-picProvince',
      postalCode: 'fap-cell-picPostalCode',
      picPostalCode: 'fap-cell-picPostalCode',
      district: 'fap-cell-picCity',
      village: 'fap-cell-picCity',
      rt: 'fap-cell-currentAddress',
      rw: 'fap-cell-currentAddress',
      country: 'fap-cell-currentAddress',
    };
    if (picMap[fieldKey]) return picMap[fieldKey];
  }

  if (fieldKey === 'companyType') {
    const val = String(extraData?.companyType || '').toUpperCase();
    if (val.includes('COMMERCIAL')) return 'fap-cell-commercial';
    if (val.includes('MICRO')) return 'fap-cell-micro';
    return 'fap-cell-corporate';
  }

  if (fieldKey === 'customerCategory') {
    const cat = String(extraData?.customerCategory || '').toUpperCase();
    return cat === 'EXISTING' ? 'fap-cell-custExisting' : 'fap-cell-custNew';
  }

  if (FIELD_TO_CELL_ID_MAP[fieldKey]) {
    return FIELD_TO_CELL_ID_MAP[fieldKey];
  }

  if (fieldKey && fieldKey.startsWith('fap-cell-')) {
    return fieldKey;
  }

  return '';
}
