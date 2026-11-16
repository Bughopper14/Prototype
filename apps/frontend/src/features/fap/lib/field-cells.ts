/** Form field key → FAP sheet cell id, used to highlight the cell being edited. */

/** Checkbox cell of each master code, per field. A code without a cell (e.g. business category MAKRO) ticks nothing. */
export const CHECKBOX_CELLS: Record<string, Record<string, string>> = {
  industrySegment: {
    MINING: 'fap-cell-seg-mining',
    AGRICULTURE: 'fap-cell-seg-agriculture',
    FORESTRY: 'fap-cell-seg-forestry',
    CONSTRUCTION: 'fap-cell-seg-construction',
    OIL_AND_GAS: 'fap-cell-seg-oilgas',
    OTHER: 'fap-cell-seg-other',
  },
  businessRole: {
    CONS_OWNER: 'fap-cell-role-consowner',
    CONTRACTORS: 'fap-cell-role-contractors',
    SUB_CONT: 'fap-cell-role-subcont',
    RENTAL: 'fap-cell-role-rental',
    OTHER: 'fap-cell-role-other',
  },
  companyType: {
    CORPORATE: 'fap-cell-corporate',
    COMMERCIAL: 'fap-cell-commercial',
    MICRO: 'fap-cell-micro',
    LIUGONG_USER: 'fap-cell-liugongUser',
  },
  customerCategory: {NEW: 'fap-cell-custNew', EXISTING: 'fap-cell-custExisting'},
};

export const FIELD_TO_CELL_ID_MAP: Record<string, string> = {
  // Application / Header
  applicationDate: 'fap-cell-applicationDate',
  branchCode: 'fap-cell-branchCode',
  fapNumber: 'fap-cell-fapNumber',
  customerStatus: 'fap-cell-custNew',
  companyType: 'fap-cell-corporate',
  industrySegment: 'fap-cell-seg-mining',
  businessRole: 'fap-cell-role-consowner',

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

  // Financing Proposal
  financingMethod: 'fap-cell-prop-method',
  financingValueProp: 'fap-cell-prop-val',
  currencyChoice: 'fap-cell-prop-curr-choice',
  applicationSource: 'fap-cell-prop-app-source',
  flInvestment: 'fap-cell-tc-fl-purpose',
  flCurrency: 'fap-cell-tc-fl-curr',
  flDeposit: 'fap-cell-tc-fl-deposit',
  flRate: 'fap-cell-tc-fl-rate',
  flTenor: 'fap-cell-tc-fl-tenor',
  flPayment: 'fap-cell-tc-fl-payment',
  slbPurpose: 'fap-cell-tc-slb-purpose',
  slbCurrency: 'fap-cell-tc-slb-curr',
  slbDeposit: 'fap-cell-tc-slb-deposit',
  slbRate: 'fap-cell-tc-slb-rate',
  slbTenor: 'fap-cell-tc-slb-tenor',
  slbPayment: 'fap-cell-tc-slb-payment',
  ifPurpose: 'fap-cell-tc-if-purpose',
  ifCurrency: 'fap-cell-tc-if-curr',
  ifDownPayment: 'fap-cell-tc-if-dp',
  ifRate: 'fap-cell-tc-if-rate',
  ifTenor: 'fap-cell-tc-if-tenor',
  ifPayment: 'fap-cell-tc-if-payment',

  // Unit Realization Plan
  propAssetLgHe: 'fap-cell-prop-asset-lg-he',
  propAssetLgTruck: 'fap-cell-prop-asset-lg-truck',
  propAssetLgUnit: 'fap-cell-prop-asset-lg-unit',
  propAssetNlgHe: 'fap-cell-prop-asset-nlg-he',
  propAssetNlgTruck: 'fap-cell-prop-asset-nlg-truck',
  propAssetNlgUnit: 'fap-cell-prop-asset-nlg-unit',
  propAssetTotUnit: 'fap-cell-prop-asset-tot-unit',

  // Notes
  proposalNotes: 'fap-cell-prop-notes',

  // Document Requirements

  // Line of Business & Legal Deeds
  mainBusiness: 'fap-cell-mainBusiness',
  establishmentActNo: 'fap-cell-establishmentActNo',
  establishmentDate: 'fap-cell-establishmentDate',
  experienceYears: 'fap-cell-experienceYears',
  experienceMonths: 'fap-cell-experienceMonths',
  latestDeedNo: 'fap-cell-latestDeedNo',
  latestDeedDate: 'fap-cell-latestDeedDate',
  shareholderDeedRef: 'fap-cell-shareholderDeedRef',
  nib: 'fap-cell-nib',
  nibDate: 'fap-cell-nib',
  npwp: 'fap-cell-npwp',

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
  // Master-driven checklists (document requirements, financing purposes) pass the sheet cell (param_key) itself.
  if (fieldKey.startsWith('fap-cell-')) return fieldKey;
  const shMatch = fieldKey.match(/^stakeholder_(\d+)_(name|pos|position|pct|share|shares|amount)$/i);
  if (shMatch) {
    const idx = shMatch[1];
    const sub = shMatch[2].toLowerCase();
    if (sub === 'name') return `fap-cell-sh-${idx}-name`;
    if (sub === 'pos' || sub === 'position') return `fap-cell-sh-${idx}-pos`;
    if (sub === 'pct' || sub === 'share') return `fap-cell-sh-${idx}-pct`;
    if (sub === 'shares' || sub === 'amount') return `fap-cell-sh-${idx}-shares`;
  }
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
    let rowIndex = extraData?.targetProjectRow ?? extraData?.rowIndex ?? 0;
    const m = section?.match(/projects-(\d+)/);
    if (m) rowIndex = parseInt(m[1], 10) || 0;
    if (rowIndex > 6) rowIndex = 6;
    if (fieldKey === 'projectOwner') return `fap-cell-proj-${rowIndex}-owner`;
    if (fieldKey === 'projectLocation' || fieldKey === 'location') return `fap-cell-proj-${rowIndex}-loc`;
    if (fieldKey === 'projectRole' || fieldKey === 'roleInProject') return `fap-cell-proj-${rowIndex}-role`;
    if (fieldKey === 'contractStatus') return `fap-cell-proj-${rowIndex}-status`;
    return `fap-cell-proj-${rowIndex}-owner`;
  }
  if (fieldKey === 'financialAudited' || fieldKey === 'isAudited' || fieldKey === 'audited') {
    return 'fap-cell-fin-audited';
  }

  if (
    section?.startsWith('financial') ||
    [
      'currentAssets',
      'nonCurrentAssets',
      'totalAssets',
      'currentLiabilities',
      'nonCurrentLiabilities',
      'totalLiabilities',
      'equity',
      'totalLiabAndEquity',
      'revenue',
      'grossMargin',
      'grossProfit',
      'operatingMargin',
      'operatingProfit',
      'tax',
      'netIncome',
      'fiscalYear',
    ].includes(fieldKey)
  ) {
    let colIdx = extraData?.targetFinYear ?? extraData?.financialActiveIndex ?? extraData?.rowIndex ?? 0;
    const m = section?.match(/(?:financial|fin)-(\d+)/);
    if (m) colIdx = parseInt(m[1], 10) || 0;
    if (colIdx > 2) colIdx = 2;

    if (fieldKey === 'fiscalYear') return `fap-cell-fin-bs-yr-${colIdx}`;
    if (fieldKey === 'currentAssets') return `fap-cell-fin-cur-asset-${colIdx}`;
    if (fieldKey === 'nonCurrentAssets') return `fap-cell-fin-noncur-asset-${colIdx}`;
    if (fieldKey === 'totalAssets') return `fap-cell-fin-tot-asset-${colIdx}`;
    if (fieldKey === 'currentLiabilities') return `fap-cell-fin-cur-liab-${colIdx}`;
    if (fieldKey === 'nonCurrentLiabilities') return `fap-cell-fin-noncur-liab-${colIdx}`;
    if (fieldKey === 'totalLiabilities') return `fap-cell-fin-tot-liab-${colIdx}`;
    if (fieldKey === 'equity') return `fap-cell-fin-equity-${colIdx}`;
    if (fieldKey === 'totalLiabAndEquity') return `fap-cell-fin-tot-liab-equity-${colIdx}`;
    if (fieldKey === 'revenue') return `fap-cell-fin-revenue-${colIdx}`;
    if (fieldKey === 'grossMargin' || fieldKey === 'grossProfit')
      return `fap-cell-fin-gross-profit-${colIdx}`;
    if (fieldKey === 'operatingMargin' || fieldKey === 'operatingProfit')
      return `fap-cell-fin-op-profit-${colIdx}`;
    if (fieldKey === 'tax') return `fap-cell-fin-tax-${colIdx}`;
    if (fieldKey === 'netIncome') return `fap-cell-fin-net-income-${colIdx}`;
    return `fap-cell-fin-bs-yr-${colIdx}`;
  }

  if (fieldKey === 'referenceComments' || fieldKey === 'comments') return 'fap-cell-ref-comments';
  if (fieldKey === 'totalMonthlyInstallment') return 'fap-cell-ref-total-installment';
  if (
    section?.startsWith('banks') ||
    section?.startsWith('references') ||
    [
      'bankOrFinInstitution',
      'currency',
      'creditFacility',
      'monthlyInstallment',
      'yearStarted',
      'interestRate',
      'paymentRecord',
      'facilityStatus',
    ].includes(fieldKey)
  ) {
    let rowIndex = extraData?.targetBankRow ?? extraData?.rowIndex ?? 0;
    const m = section?.match(/(?:banks|references|ref)-(\d+)/);
    if (m) rowIndex = parseInt(m[1], 10) || 0;
    if (rowIndex > 4) rowIndex = 4;
    if (fieldKey === 'bankOrFinInstitution') return `fap-cell-ref-${rowIndex}-bank`;
    if (fieldKey === 'currency') return `fap-cell-ref-${rowIndex}-currency`;
    if (fieldKey === 'creditFacility') return `fap-cell-ref-${rowIndex}-credit`;
    if (fieldKey === 'monthlyInstallment') return `fap-cell-ref-${rowIndex}-installment`;
    if (fieldKey === 'yearStarted') return `fap-cell-ref-${rowIndex}-year`;
    if (fieldKey === 'interestRate') return `fap-cell-ref-${rowIndex}-rate`;
    if (fieldKey === 'paymentRecord') return `fap-cell-ref-${rowIndex}-record`;
    if (fieldKey === 'facilityStatus') return `fap-cell-ref-${rowIndex}-status`;
    return `fap-cell-ref-${rowIndex}-bank`;
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

  // Checkbox cells are chosen by the master code stored on the application (industry segment, business role, business category, customer status)
  const checkbox = CHECKBOX_CELLS[fieldKey]?.[String(extraData?.[fieldKey] ?? '')];
  if (checkbox) return checkbox;

  if (FIELD_TO_CELL_ID_MAP[fieldKey]) {
    return FIELD_TO_CELL_ID_MAP[fieldKey];
  }

  if (fieldKey && fieldKey.startsWith('fap-cell-')) {
    return fieldKey;
  }

  return '';
}
