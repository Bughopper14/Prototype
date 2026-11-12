export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  optionLabels?: Record<string, string>;
  wide?: boolean;
  required?: boolean;
  unit?: string;
  /** false renders a plain input/select even when the key has a master-data list. */
  master?: boolean;
  /** Read-only for this field only (the user cannot change it). */
  locked?: boolean;
  /** Value of a new blank row; when omitted, the first option (or ''/0/null) is used. */
  defaultValue?: string;
};
const f = (key: string, label: string, type = 'text', options?: string[]): Field => ({
  key,
  label,
  type,
  options,
});

const LOWERCASE_WORDS = new Set(['at', 'in', 'or', 'of', 'dan', 'yang', 'di', 'ke', 'dari']);
const UPPERCASE_WORDS = new Set([
  'rt',
  'rw',
  'ktp',
  'npwp',
  'nib',
  'pic',
  'fap',
  'cfo',
  'ceo',
  'coo',
  'los',
  'crm',
  'id',
  'zip',
  'pt',
  'cv',
  'ud',
  'tbk',
  'llc',
  'ltd',
  'inc',
  'corp',
  'bumn',
  'bumd',
  'pma',
  'pmdn',
  'blu',
  'perum',
  'koperasi',
]);

export function toTitleCase(str: string): string {
  if (!str) return '';
  return str.replace(/\b([a-zA-Z]+)\b/g, (word, offset) => {
    const lower = word.toLowerCase();
    if (UPPERCASE_WORDS.has(lower)) {
      return lower.toUpperCase();
    }
    if (offset > 0 && LOWERCASE_WORDS.has(lower)) {
      return lower;
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}

export const profileFields = [
  f('branchCode', 'Branch', 'select', ['JKT01', 'BPN01', 'PLB01', 'MDN01', 'SBY01']),
  f('customerStatus', 'Customer Relationship', 'select', ['NEW', 'EXISTING']),
  f('companyAddress', 'Company Address'),
  f('province', 'Province'),
  f('city', 'City'),
  f('district', 'District'),
  f('village', 'Village / Sub-district'),
  f('rt', 'RT'),
  f('rw', 'RW'),
  f('postalCode', 'Postal Code'),
  f('phoneFax', 'Phone / Fax'),
  f('email', 'Company Email', 'email'),
  f('website', 'Website'),
  f('mainBusiness', 'Main Business'),
  f('experienceYears', 'Experience · Years', 'number'),
  f('experienceMonths', 'Experience · Months', 'number'),
  f('locationStatus', 'Business Premises', 'select', ['OWNED', 'RENTED', 'OTHER']),
  f('repaymentSource', 'Source of Repayment'),
  f('latestDeedNo', 'Latest Deed Number'),
  f('latestDeedDate', 'Latest Deed Date', 'date'),
  f('industrySegment', 'Industry', 'select', [
    'MINING',
    'AGRICULTURE',
    'FORESTRY',
    'CONSTRUCTION',
    'OIL_AND_GAS',
    'OTHER',
  ]),
  f('businessRole', 'Business Role', 'select', ['CONS_OWNER', 'CONTRACTORS', 'SUB_CONT', 'RENTAL', 'OTHER']),
  f('assetSummaryHeLiuGong', 'Asset Summary HE LiuGong', 'number'),
  f('assetSummaryTruckLiuGong', 'Asset Summary Truck LiuGong', 'number'),
  f('assetSummaryHeNonLiuGong', 'Asset Summary HE Non-LiuGong', 'number'),
  f('assetSummaryTruckNonLiuGong', 'Asset Summary Truck Non-LiuGong', 'number'),
  f('financingPurposeDetail', 'Financing Purpose Detail'),
  f('referenceComments', 'Bank Reference Comments'),
  f('financingProposalJson', 'Financing Proposal JSON'),
];

/** Profile keys that belong to one application only, never copied to the customer directory. */
export const applicationOnlyProfileKeys = [
  'financingPurposeDetail',
  'referenceComments',
  'financingProposalJson',
];

export const customerFields = [
  f('companyName', 'Company Name'),
  f('companyType', 'Business Category', 'select', ['CORPORATE', 'COMMERCIAL', 'MICRO', 'LIUGONG_USER']),
  f('nib', 'NIB'),
  f('nibDate', 'NIB Established Date', 'date'),
  f('npwp', 'NPWP'),
  f('establishmentActNo', 'Establishment Deed Number'),
  f('establishmentDate', 'Establishment Deed Date', 'date'),
];

export const picFields = [
  f('picName', 'Contact Name'),
  f('position', 'Position'),
  f('phone', 'Phone Number'),
  f('email', 'Email', 'email'),
  f('country', 'Country'),
  f('province', 'Province'),
  f('city', 'City / Regency'),
  f('district', 'District'),
  f('village', 'Village / Sub-District'),
  f('rt', 'RT'),
  f('rw', 'RW'),
  f('postalCode', 'Postal Code'),
  {...f('currentAddress', 'Full Address', 'textarea'), wide: true},
];

export const STAKEHOLDER_POSITIONS = [
  'MAIN_DIRECTOR',
  'DIRECTOR',
  'MAIN_COMMISSIONER',
  'COMMISSIONER',
  'BOARD_OF_DIRECTORS',
  'AUTORIZED_REPRESENTATIVE',
] as const;

export const STAKEHOLDER_POSITION_LABELS: Record<string, string> = {
  MAIN_DIRECTOR: 'Main Director',
  DIRECTOR: 'Director',
  MAIN_COMMISSIONER: 'Main Commissioner',
  COMMISSIONER: 'Commissioner',
  BOARD_OF_DIRECTORS: 'Board of Directors',
  AUTORIZED_REPRESENTATIVE: 'Autorized Representative',
};

export function formatStakeholderPosition(val?: string | null): string {
  if (!val) return '';
  const clean = String(val).trim();
  const upper = clean.toUpperCase().replace(/[\s-]+/g, '_');
  if (['NONE', '', '_', 'SHAREHOLDER'].includes(upper)) return '';
  const aliases: Record<string, string> = {
    ...STAKEHOLDER_POSITION_LABELS,
    AUTHORIZED_REPRESENTATIVE: 'Autorized Representative',
    PRESIDENT_DIRECTOR: 'Main Director',
    PRESIDENT_COMMISSIONER: 'Main Commissioner',
  };
  if (aliases[upper] && upper !== 'NONE') return aliases[upper];
  const match = Object.values(STAKEHOLDER_POSITION_LABELS).find(v => v.toLowerCase() === clean.toLowerCase());
  if (match) return match;
  if (clean.toLowerCase() === 'authorized representative') return 'Autorized Representative';
  return clean;
}

/** Any stored position wording (English, Indonesian, legacy) → its STAKEHOLDER_POSITIONS key. */
export function normalizeStakeholderPositionKey(pos?: string | null): string {
  if (!pos) return '';
  const clean = String(pos)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (['NONE', '', '_', 'SHAREHOLDER'].includes(clean)) return '';
  if (['MAIN_DIRECTOR', 'PRESIDENT_DIRECTOR', 'DIREKTUR_UTAMA'].includes(clean)) return 'MAIN_DIRECTOR';
  if (['DIRECTOR', 'DIREKTUR'].includes(clean)) return 'DIRECTOR';
  if (['MAIN_COMMISSIONER', 'PRESIDENT_COMMISSIONER', 'KOMISARIS_UTAMA'].includes(clean))
    return 'MAIN_COMMISSIONER';
  if (['COMMISSIONER', 'KOMISARIS'].includes(clean)) return 'COMMISSIONER';
  if (['BOARD_OF_DIRECTORS', 'BOD', 'DIREKSI'].includes(clean)) return 'BOARD_OF_DIRECTORS';
  if (['AUTORIZED_REPRESENTATIVE', 'AUTHORIZED_REPRESENTATIVE', 'KUASA_HUKUM'].includes(clean))
    return 'AUTORIZED_REPRESENTATIVE';
  return '';
}

export const stakeholderFields = [
  f('representativeType', 'Representative Type', 'select', [
    'DIRECTOR',
    'SHAREHOLDER',
    'AUTHORIZED_SIGNATORY',
    'OTHER',
  ]),
  {
    ...f('positions', 'Positions', 'select', [
      'MAIN_DIRECTOR',
      'DIRECTOR',
      'MAIN_COMMISSIONER',
      'COMMISSIONER',
      'BOARD_OF_DIRECTORS',
      'AUTORIZED_REPRESENTATIVE',
    ]),
    optionLabels: STAKEHOLDER_POSITION_LABELS,
    defaultValue: '',
  },
  f('stakeholderType', 'Type', 'select', ['INDIVIDUAL', 'CORPORATE']),
  {...f('signatory', 'Signatory', 'select', ['YES', 'NO']), defaultValue: ''},
  {
    ...f('idType', 'ID Type', 'select', ['KTP_NPWP', 'PASSPORT_KITAS']),
    optionLabels: {KTP_NPWP: 'KTP - NPWP', PASSPORT_KITAS: 'PASSPORT - KITAS'},
    defaultValue: '',
  },
  f('idNumber', 'ID Number - [KTP or PASSPORT]'),
  f('idNumberSecondary', 'ID Number - [NPWP or KITAS]'),
  {...f('title', 'Title', 'select', ['MR', 'MRS', 'MS', 'DR', 'OTHER']), defaultValue: ''},
  f('firstName', 'First Name'),
  f('middleName', 'Middle Name'),
  f('lastName', 'Last Name'),
  f('dateOfBirth', 'Date of Birth', 'date'),
  f('ageYears', 'Age · Years', 'number'),
  f('ageMonths', 'Age · Months', 'number'),
  {
    ...f('maritalStatus', 'Marital Status', 'select', [
      'SINGLE',
      'MARRIED',
      'DIVORCED',
      'WIDOWED',
      'OTHER',
    ]),
    defaultValue: '',
  },
  {
    ...f('designation', 'Designation', 'select', [
      'DIRECTOR',
      'COMMISSIONER',
      'PRESIDENT_DIRECTOR',
      'OWNER',
      'MANAGER',
      'OTHER',
    ]),
    defaultValue: '',
  },
  f('occupation', 'Occupation'),
  {...f('email', 'Email', 'email'), required: true},
  {...f('mobilePhone', 'Mobile Phone', 'tel'), required: true},
  {...f('gender', 'Gender', 'select', ['MALE', 'FEMALE', 'OTHER']), defaultValue: ''},
  f('sharePercentage', 'Percentage Share', 'number'),
  f('depositedCapital', 'Deposited Capital (IDR)', 'number'),
  {...f('primaryCapital', 'Primary Capital (IDR)', 'number'), required: true},
  f('citizenship', 'Citizenship', 'select', ['INDONESIAN', 'FOREIGN']),
  f('country', 'Country'),
  f('province', 'Province'),
  f('cityRegency', 'City / Regency'),
  f('district', 'District'),
  f('village', 'Village / Sub-District'),
  f('rt', 'RT'),
  f('rw', 'RW'),
  f('address', 'Address'),
  f('postalCode', 'Postal / ZIP Code'),
];

export const projectFields = [
  f('projectOwner', 'Project Owner'),
  f('projectLocation', 'Location'),
  f('projectRole', 'Role in Project'),
  {...f('contractStatus', 'Contract Status', 'select', ['EXISTING', 'NEW']), defaultValue: ''},
];

export const bankFields = [
  f('bankOrFinInstitution', 'Bank / Financial Institution'),
  f('currency', 'Currency', 'select', ['IDR']),
  f('creditFacility', 'Credit Facility (IDR)', 'number'),
  f('monthlyInstallment', 'Monthly Installment (IDR)', 'number'),
  f('yearStarted', 'Year Started', 'number'),
  f('interestRate', 'Interest Rate (%)', 'number'),
  f('paymentRecord', 'Payment Record'),
  f('facilityStatus', 'Facility Status', 'select', ['Active', 'Settled']),
  f('comments', 'Comments'),
];

export const proposalFields = [
  f('facilityPurpose', 'Facility Purpose', 'select', ['INVESTMENT', 'WORKING_CAPITAL']),
  f('purposeDetail', 'Purpose Details'),
  f('financingMethod', 'Financing Method', 'select', [
    'FINANCIAL_LEASE',
    'SALE_AND_LEASE_BACK',
    'INSTALLMENT_FINANCING',
  ]),
  f('currency', 'Currency', 'select', ['IDR']),
  f('financingValue', 'Total Equipment Value (IDR)', 'number'),
  f('downPaymentValue', 'Down Payment (IDR)', 'number'),
  f('securityDeposit', 'Security Deposit (IDR)', 'number'),
  f('interestRate', 'Annual Interest Rate (%)', 'number'),
  f('tenorMonths', 'Tenor (Months)', 'number'),
  f('paymentMethod', 'Payment Timing', 'select', ['In Arrear', 'In Advance']),
  f('applicationSource', 'Application Source'),
  f('termsNotes', 'Terms and Notes'),
];

export const unitFields = [
  f('assetName', 'Asset Name'),
  f('unitCategory', 'Unit Category', 'select', ['HE', 'TRUCK']),
  f('brand', 'Brand'),
  f('unitType', 'Type'),
  f('modelName', 'Model'),
  {...f('classTon', 'Class', 'number'), unit: 'ton'},
  f('quantity', 'Total Unit', 'number'),
  f('years', 'Years', 'number'),
  {...f('specifications', 'Specifications', 'textarea'), wide: true},
];

export const financialFields = [
  f('currentAssets', 'Current Assets', 'number'),
  f('nonCurrentAssets', 'Non-Current Assets', 'number'),
  f('totalAssets', 'Total Assets', 'number'),
  f('currentLiabilities', 'Current Liabilities', 'number'),
  f('nonCurrentLiabilities', 'Non-Current Liabilities', 'number'),
  f('totalLiabilities', 'Total Liabilities', 'number'),
  f('equity', 'Equity', 'number'),
  f('totalLiabAndEquity', 'Total Liabilities & Equity', 'number'),
  f('revenue', 'Revenue', 'number'),
  f('grossMargin', 'Gross Profit', 'number'),
  f('operatingMargin', 'Operating Profit (EBIT)', 'number'),
  f('tax', 'Tax', 'number'),
  f('netIncome', 'Net Income', 'number'),
];

export const blank = (fields: Field[]) =>
  Object.fromEntries(
    fields.map(f => [
      f.key,
      f.defaultValue ?? f.options?.[0] ?? (f.type === 'number' ? 0 : f.type === 'date' ? null : ''),
    ]),
  );
export const label = (s: string) => (s ? toTitleCase(s.replaceAll('_', ' ')) : '—');
export const legalDeedFields = [
  {...f('deedNumber', 'Deed Number'), required: true},
  {...f('deedDate', 'Deed Date', 'date'), required: true},
  f('ministerialDecreeNumber', 'Ministerial Decree Number'),
  f('ministerialDecreeDate', 'Ministerial Decree Date', 'date'),
];
export const legalPartyFields: Field[] = [];
