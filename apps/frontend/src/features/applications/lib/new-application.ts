import {blank, picFields, profileFields, projectFields, proposalFields} from '@liugong/shared';
import {applyMasterCustomerToDraft, emptyCustomerRecord} from './master-customer-fill';

export const createDefaultFinancialStatement = (fiscalYear: number, isAudited = false) => ({
  fiscalYear,
  isAudited,
  currentAssets: '',
  nonCurrentAssets: '',
  totalAssets: '',
  currentLiabilities: '',
  nonCurrentLiabilities: '',
  totalLiabilities: '',
  equity: '',
  totalLiabAndEquity: '',
  revenue: '',
  grossMargin: '',
  operatingMargin: '',
  tax: '',
  netIncome: '',
});

/** An empty application, ready to be filled in before it is saved for the first time. */
export function buildNewApplicationDraft(customers: any[], preselectedCustomerId?: string) {
  const category = preselectedCustomerId ? 'EXISTING' : 'NEW';
  const customer = preselectedCustomerId ? customers.find(c => c.id === preselectedCustomerId) : null;
  const currentYear = new Date().getFullYear();

  const baseDraft = {
    ...blank(profileFields),
    experienceYears: '',
    experienceMonths: '',
    assetSummaryHeLiuGong: '',
    assetSummaryTruckLiuGong: '',
    assetSummaryHeNonLiuGong: '',
    assetSummaryTruckNonLiuGong: '',
    id: 'new',
    isNew: true,
    fapNumber: 'Auto (Generated on save)',
    applicationDate: new Date().toISOString().slice(0, 10),
    status: 'DRAFT',
    stage: 'FAP Stage',
    customerStatus: category,
    customerCategory: category,
    customerId: customer?.id || preselectedCustomerId || '',
    customer: emptyCustomerRecord(),
    branchCode: '',
    locationStatus: '',
    industrySegment: '',
    businessRole: '',
    mainBusiness: '',
    repaymentSource: '',
    companyAddress: '',
    province: '',
    city: '',
    district: '',
    village: '',
    rt: '',
    rw: '',
    postalCode: '',
    phoneFax: '',
    email: '',
    website: '',
    pic: blank(picFields),
    stakeholders: [],
    projects: [blank(projectFields)],
    bankReferences: [],
    proposal: {
      ...blank(proposalFields),
      facilityPurpose: '',
      financingMethod: '',
      currency: '',
      paymentMethod: '',
      financingValue: '',
      units: [],
    },
    financingProposal: {
      facilityProposed: {
        financingMethod: '',
        currencyChoice: '',
        financingValue: '',
        applicationSource: '',
      },
      realizationPlan: {
        lgHe: '',
        lgTruck: '',
        nlgHe: '',
        nlgTruck: '',
      },
      termsFinancialLease: {
        workingCapitalInvestment: '',
        currency: '',
        securityDeposit: '',
        interestRate: '',
        tenor: '',
        paymentMethod: '',
      },
      notes: '',
    },
    financialAudited: false,
    financialStatements: [
      createDefaultFinancialStatement(currentYear - 2, false),
      createDefaultFinancialStatement(currentYear - 1, false),
      createDefaultFinancialStatement(currentYear, false),
    ],
    documentChecks: [],
    legal: {deeds: []},
    signoffs: [],
    approvalLogs: [],
  };

  return customer ? applyMasterCustomerToDraft(customer, baseDraft) : baseDraft;
}
