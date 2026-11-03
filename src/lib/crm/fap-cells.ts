// Types and cell-id lookup tables shared by the FAP sheet preview and the application screens.

export interface FapSheetData {
  fapNumber?: string;
  applicationDate?: string;
  branchCode?: string;
  customerStatus?: string;
  companyName?: string;
  companyType?: string;
  nib?: string;
  nibDate?: string;
  npwp?: string;
  establishmentActNo?: string;
  establishmentDate?: string;
  companyAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  experienceYears?: string | number;
  experienceMonths?: string | number;
  mainBusiness?: string;
  latestDeedNo?: string;
  latestDeedDate?: string;
  phoneFax?: string;
  website?: string;
  email?: string;
  repaymentSource?: string;
  locationStatus?: string;
  picName?: string;
  position?: string;
  phone?: string;
  currentAddress?: string;
  picCity?: string;
  picProvince?: string;
  picPostalCode?: string;
  selectedDeedNo?: string;
  stakeholders?: any[];
  projects?: any[];
  [key: string]: any;
}

export interface FapSheetPreviewProps {
  data?: FapSheetData;
  application?: any;
  customer?: any;
  profile?: any;
  pic?: any;
  stakeholders?: any[];
  projects?: any[];
  compact?: boolean;
  readOnly?: boolean;
  activeSection?: string | null;
  activeField?: string | null;
  syncTick?: number;
  onSectionClick?: (sectionId: string) => void;
  onPreviewCellClick?: (fieldKey: string, sectionId?: string) => void;
  onPrint?: () => void | Promise<void>;
  hideToolbar?: boolean;
  isComparison?: boolean;
  diffs?: any[];
  diffSide?: 'system' | 'ocr';
  onDiffClick?: (field: string) => void;
  externalZoom?: number;
  onZoomChange?: (z: number) => void;
}

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
  if (section?.startsWith('projects') || ['projectOwner', 'projectLocation', 'location', 'projectRole', 'roleInProject', 'contractStatus'].includes(fieldKey)) {
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


export const SECTION_TO_CELL_IDS_MAP: Record<string, string[]> = {
  'fap-preview-sec-header': [
    'fap-cell-applicationDate',
    'fap-cell-fapNumber',
    'fap-cell-custNew',
    'fap-cell-custExisting',
    'fap-cell-corporate',
    'fap-cell-commercial',
    'fap-cell-micro',
    'fap-cell-companyName',
    'fap-cell-nib',
    'fap-cell-npwp',
    'fap-cell-establishmentActNo',
    'fap-cell-establishmentDate',
  ],
  'fap-preview-sec-company': [
    'fap-cell-branchCode',
    'fap-cell-liugongUser',
    'fap-cell-locationStatus',
    'fap-cell-companyAddress',
    'fap-cell-city',
    'fap-cell-province',
    'fap-cell-postalCode',
    'fap-cell-phoneFax',
    'fap-cell-website',
    'fap-cell-email',
  ],
  'fap-preview-sec-business': [
    'fap-cell-mainBusiness',
    'fap-cell-repaymentSource',
    'fap-cell-experienceYears',
    'fap-cell-experienceMonths',
    'fap-cell-latestDeedNo',
    'fap-cell-latestDeedDate',
  ],
  'fap-preview-sec-pic': [
    'fap-cell-picName',
    'fap-cell-phone',
    'fap-cell-position',
    'fap-cell-picEmail',
    'fap-cell-currentAddress',
    'fap-cell-picCity',
    'fap-cell-picProvince',
    'fap-cell-picPostalCode',
  ],
  'fap-preview-sec-projects': [
    'fap-cell-proj-0-owner', 'fap-cell-proj-0-loc', 'fap-cell-proj-0-role', 'fap-cell-proj-0-status',
    'fap-cell-proj-1-owner', 'fap-cell-proj-1-loc', 'fap-cell-proj-1-role', 'fap-cell-proj-1-status',
    'fap-cell-proj-2-owner', 'fap-cell-proj-2-loc', 'fap-cell-proj-2-role', 'fap-cell-proj-2-status',
    'fap-cell-proj-3-owner', 'fap-cell-proj-3-loc', 'fap-cell-proj-3-role', 'fap-cell-proj-3-status',
    'fap-cell-proj-4-owner', 'fap-cell-proj-4-loc', 'fap-cell-proj-4-role', 'fap-cell-proj-4-status',
    'fap-cell-proj-5-owner', 'fap-cell-proj-5-loc', 'fap-cell-proj-5-role', 'fap-cell-proj-5-status',
    'fap-cell-proj-6-owner', 'fap-cell-proj-6-loc', 'fap-cell-proj-6-role', 'fap-cell-proj-6-status',
  ],
};

export const SECTION_TO_SCROLL_TARGET_MAP: Record<string, string> = {
  'fap-preview-sec-header': 'fap-cell-fapNumber',
  'fap-preview-sec-company': 'fap-cell-companyAddress',
  'fap-preview-sec-business': 'fap-cell-mainBusiness',
  'fap-preview-sec-pic': 'fap-cell-picName',
  'fap-preview-sec-projects': 'fap-cell-proj-0-owner',
};

export const SECTION_TO_CELL_ID_MAP: Record<string, string> = {
  ...SECTION_TO_SCROLL_TARGET_MAP,
};

export const CELL_ID_TO_SECTION_MAP: Record<string, string> = {
  // Header / Identity
  'fap-cell-applicationDate': 'fap-preview-sec-header',
  'fap-cell-fapNumber': 'fap-preview-sec-header',
  'fap-cell-custNew': 'fap-preview-sec-header',
  'fap-cell-custExisting': 'fap-preview-sec-header',
  'fap-cell-corporate': 'fap-preview-sec-header',
  'fap-cell-commercial': 'fap-preview-sec-header',
  'fap-cell-micro': 'fap-preview-sec-header',
  'fap-cell-companyName': 'fap-preview-sec-header',
  'fap-cell-nib': 'fap-preview-sec-header',
  'fap-cell-npwp': 'fap-preview-sec-header',
  'fap-cell-establishmentActNo': 'fap-preview-sec-header',
  'fap-cell-establishmentDate': 'fap-preview-sec-header',

  // Company / Domicile
  'fap-cell-branchCode': 'fap-preview-sec-company',
  'fap-cell-liugongUser': 'fap-preview-sec-company',
  'fap-cell-locationStatus': 'fap-preview-sec-company',
  'fap-cell-companyAddress': 'fap-preview-sec-company',
  'fap-cell-city': 'fap-preview-sec-company',
  'fap-cell-province': 'fap-preview-sec-company',
  'fap-cell-postalCode': 'fap-preview-sec-company',
  'fap-cell-phoneFax': 'fap-preview-sec-company',
  'fap-cell-website': 'fap-preview-sec-company',
  'fap-cell-email': 'fap-preview-sec-company',

  // Business Profile & Deeds
  'fap-cell-mainBusiness': 'fap-preview-sec-business',
  'fap-cell-repaymentSource': 'fap-preview-sec-business',
  'fap-cell-experienceYears': 'fap-preview-sec-business',
  'fap-cell-experienceMonths': 'fap-preview-sec-business',
  'fap-cell-latestDeedNo': 'fap-preview-sec-business',
  'fap-cell-latestDeedDate': 'fap-preview-sec-business',

  // PIC
  'fap-cell-picName': 'fap-preview-sec-pic',
  'fap-cell-phone': 'fap-preview-sec-pic',
  'fap-cell-position': 'fap-preview-sec-pic',
  'fap-cell-picEmail': 'fap-preview-sec-pic',
  'fap-cell-currentAddress': 'fap-preview-sec-pic',
  'fap-cell-picCity': 'fap-preview-sec-pic',
  'fap-cell-picProvince': 'fap-preview-sec-pic',
  'fap-cell-picPostalCode': 'fap-preview-sec-pic',

  // Projects (Pemilik Proyek)
  'fap-cell-proj-0-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-0-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-0-role': 'fap-preview-sec-projects',
  'fap-cell-proj-0-status': 'fap-preview-sec-projects',
  'fap-cell-proj-1-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-1-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-1-role': 'fap-preview-sec-projects',
  'fap-cell-proj-1-status': 'fap-preview-sec-projects',
  'fap-cell-proj-2-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-2-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-2-role': 'fap-preview-sec-projects',
  'fap-cell-proj-2-status': 'fap-preview-sec-projects',
  'fap-cell-proj-3-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-3-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-3-role': 'fap-preview-sec-projects',
  'fap-cell-proj-3-status': 'fap-preview-sec-projects',
  'fap-cell-proj-4-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-4-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-4-role': 'fap-preview-sec-projects',
  'fap-cell-proj-4-status': 'fap-preview-sec-projects',
  'fap-cell-proj-5-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-5-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-5-role': 'fap-preview-sec-projects',
  'fap-cell-proj-5-status': 'fap-preview-sec-projects',
  'fap-cell-proj-6-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-6-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-6-role': 'fap-preview-sec-projects',
  'fap-cell-proj-6-status': 'fap-preview-sec-projects',

  // Shareholders
  'fap-cell-sh-0-name': 'fap-preview-sec-projects',
  'fap-cell-sh-0-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-0-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-0-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-1-name': 'fap-preview-sec-projects',
  'fap-cell-sh-1-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-1-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-1-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-2-name': 'fap-preview-sec-projects',
  'fap-cell-sh-2-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-2-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-2-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-3-name': 'fap-preview-sec-projects',
  'fap-cell-sh-3-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-3-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-3-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-4-name': 'fap-preview-sec-projects',
  'fap-cell-sh-4-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-4-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-4-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-5-name': 'fap-preview-sec-projects',
  'fap-cell-sh-5-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-5-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-5-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-6-name': 'fap-preview-sec-projects',
  'fap-cell-sh-6-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-6-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-6-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-7-name': 'fap-preview-sec-projects',
  'fap-cell-sh-7-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-7-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-7-pct': 'fap-preview-sec-projects',
};

export function printFapDocument(_fapNumber?: string) {
  window.print();
}
