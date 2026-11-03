import {
  blank,
  customerFields,
  picFields,
  profileFields,
  projectFields,
  proposalFields,
} from '@/lib/shared/fields';

/** An empty application, ready to be filled in before it is saved for the first time. */
export function buildNewApplicationDraft(customers: any[], preselectedCustomerId?: string) {
  const category = preselectedCustomerId ? 'EXISTING' : 'NEW';
  const customer = preselectedCustomerId ? customers.find(c => c.id === preselectedCustomerId) : null;

  return {
    ...blank(profileFields),
    id: 'new',
    isNew: true,
    fapNumber: 'Auto (Generated on save)',
    applicationDate: new Date().toISOString().slice(0, 10),
    status: 'DRAFT',
    stage: 'FAP Stage',
    customerStatus: category,
    customerCategory: category,
    customerId: customer?.id || '',
    customer: customer ? structuredClone(customer) : blank(customerFields),
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
    proposal: {...blank(proposalFields), units: []},
    financialStatements: [],
    documentChecks: [],
    legal: {deeds: []},
    signoffs: [],
    approvalLogs: [],
  };
}
