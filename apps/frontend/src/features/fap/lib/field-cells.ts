/** Form field key → FAP sheet cell id, used to highlight the cell being edited. */

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

  // Purpose & Assets (Section 05)
  financingPurposeDetail: 'fap-cell-purpose-business',
  facilityPurpose: 'fap-cell-purpose-business',
  assetSummaryHeLiuGong: 'fap-cell-asset-lg-he',
  assetSummaryTruckLiuGong: 'fap-cell-asset-lg-truck',
  assetSummaryHeNonLiuGong: 'fap-cell-asset-nlg-he',
  assetSummaryTruckNonLiuGong: 'fap-cell-asset-nlg-truck',

  // Projects (Section 06)
  projectOwner: 'fap-cell-proj-0-owner',
  projectLocation: 'fap-cell-proj-0-loc',
  location: 'fap-cell-proj-0-loc',
  projectRole: 'fap-cell-proj-0-role',
  roleInProject: 'fap-cell-proj-0-role',
  contractStatus: 'fap-cell-proj-0-status',

  // References & Banks (Section 07)
  bankOrFinInstitution: 'fap-cell-ref-0-bank',
  currency: 'fap-cell-ref-0-currency',
  creditFacility: 'fap-cell-ref-0-credit',
  monthlyInstallment: 'fap-cell-ref-0-installment',
  yearStarted: 'fap-cell-ref-0-year',
  interestRate: 'fap-cell-ref-0-rate',
  paymentRecord: 'fap-cell-ref-0-record',
  facilityStatus: 'fap-cell-ref-0-status',
  referenceComments: 'fap-cell-ref-comments',
  comments: 'fap-cell-ref-comments',
  totalMonthlyInstallment: 'fap-cell-ref-total-installment',

  // Proposal (Section 08)
  financingMethod: 'fap-cell-prop-method',
  financingValue: 'fap-cell-prop-val',
  applicationSource: 'fap-cell-prop-app-source',
  currencyChoice: 'fap-cell-prop-curr-choice',
  notes: 'fap-cell-prop-notes',

  // Financial statements & Audited (Section 09)
  financialAudited: 'fap-cell-fin-audited',
  isAudited: 'fap-cell-fin-audited',
  audited: 'fap-cell-fin-audited',
  fiscalYear: 'fap-cell-fin-bs-yr-0',
  currentAssets: 'fap-cell-fin-cur-asset-0',
  nonCurrentAssets: 'fap-cell-fin-noncur-asset-0',
  totalAssets: 'fap-cell-fin-tot-asset-0',
  currentLiabilities: 'fap-cell-fin-cur-liab-0',
  nonCurrentLiabilities: 'fap-cell-fin-noncur-liab-0',
  totalLiabilities: 'fap-cell-fin-tot-liab-0',
  equity: 'fap-cell-fin-equity-0',
  totalLiabAndEquity: 'fap-cell-fin-tot-liab-equity-0',
  revenue: 'fap-cell-fin-revenue-0',
  grossMargin: 'fap-cell-fin-gross-profit-0',
  grossProfit: 'fap-cell-fin-gross-profit-0',
  operatingMargin: 'fap-cell-fin-op-profit-0',
  operatingProfit: 'fap-cell-fin-op-profit-0',
  tax: 'fap-cell-fin-tax-0',
  netIncome: 'fap-cell-fin-net-income-0',

  // Shareholders
  shareholders: 'fap-cell-sh-0-name',
  sharePercentage: 'fap-cell-sh-0-pct',
  primaryCapital: 'fap-cell-sh-0-shares',
  depositedCapital: 'fap-cell-sh-0-shares',
};

export function resolveFieldToCellId(fieldKey: string, section?: string | null, extraData?: any): string {
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
    if (fieldKey === 'grossMargin' || fieldKey === 'grossProfit') return `fap-cell-fin-gross-profit-${colIdx}`;
    if (fieldKey === 'operatingMargin' || fieldKey === 'operatingProfit') return `fap-cell-fin-op-profit-${colIdx}`;
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

  if (fieldKey === 'industrySegment') {
    const seg = String(extraData?.industrySegment || '').toUpperCase();
    if (seg.includes('MINING') || seg.includes('TAMBANG')) return 'fap-cell-seg-mining';
    if (seg.includes('AGRI') || seg.includes('TANI')) return 'fap-cell-seg-agriculture';
    if (seg.includes('FOREST') || seg.includes('HUTAN')) return 'fap-cell-seg-forestry';
    if (seg.includes('CONST') || seg.includes('KONSTRUKSI')) return 'fap-cell-seg-construction';
    if (seg.includes('OIL') || seg.includes('GAS')) return 'fap-cell-seg-oilgas';
    if (seg.includes('OTHER') || seg.includes('LAIN')) return 'fap-cell-seg-other';
    return 'fap-cell-seg-mining';
  }

  if (fieldKey === 'businessRole') {
    const role = String(extraData?.businessRole || '').toUpperCase();
    if (role.includes('CONS') || role.includes('OWNER')) return 'fap-cell-role-consowner';
    if (role.includes('CONTRACTOR') || role.includes('KONTRAKTOR')) return 'fap-cell-role-contractors';
    if (role.includes('SUB') || role.includes('CONT')) return 'fap-cell-role-subcont';
    if (role.includes('RENTAL') || role.includes('SEWA')) return 'fap-cell-role-rental';
    if (role.includes('OTHER') || role.includes('LAIN')) return 'fap-cell-role-other';
    return 'fap-cell-role-consowner';
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
