/** The blank Pre-Analysis form (it also fills any key a saved form does not have) and the signature date of today. */
import type {PreAnalysisData} from '@/features/pre-analysis/lib/types';
import {EMPTY_GROUP_STRUCTURE} from '@/features/pre-analysis/lib/group-structure';

export const getTodaySignatureDate = (): string => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd} / ${mm} / ${yyyy}`;
};

export const defaultInitialData: PreAnalysisData = {
  preAnalysisNo: '',
  preAnalysisDate: '',
  customerProjectName: '',
  taxId: '',
  fapNumber: '',
  leadSource: '',
  customerArea: '',
  dealerPic: '',
  lmiPic: '',
  lfiPic: '',
  customerPic: '',
  equity: '',
  paidUpCapital: '',
  sourceOfRepayment: '',

  // 2. PROJECT INFORMATION
  holdingGroup: '',
  projectName: '',
  projectLocation: '',
  currentProjects: [],
  historyProjects: [],
  investmentProjectPlans: [],
  existingProjects: '',
  newProjects: '',
  projectNameLocation: '',
  customerRole: '',
  otherContractors: '',
  projectOwner: '',
  bowheerInfo: '',
  projectStatus: '',
  projectStatusRemarks: '',
  investmentPlan: '',
  investmentPlanSelected: [],
  investmentPlanRemarks: {},
  financingSchemeRequested: '',

  // 3. CUSTOMER & GROUP BACKGROUND
  ubo: '',
  uboInfo: '',
  companyBackground: '',
  businessDevBackground: '',
  operationalTeamInfo: '',
  groupStructureImage: '',
  showUboInformation: true,
  uboInformation: '',
  groupStructure: EMPTY_GROUP_STRUCTURE,
  milestones: [],
  existingFincoBackup: '',

  // 4. EQUIPMENT POSSIBILITY OF SUCCESS
  equipmentJobFit: '',
  utilizationDuration: '',
  priorLiugongExperience: '',
  serviceAgreementFmc: '',
  unitComposition: [],

  // 5. UNIT DELIVERY STATUS & QA CHECK
  deliveryStatus: '',
  deliveryDate: '',
  qaIlinkComment: '',
  qaDocumentName: '',
  qaDocumentFile: '',
  qaConclusion: '',

  // 6. CROSS-CHECK WITH DEALER / LMI
  dealerCheck: '',
  topDealerToCustomer: '',
  topLmiToDealer: '',
  lmiArCheck: '',
  slikPefindoHighlight: '',
  applicantPefindoCheck: '',
  pefindoTerms: '',
  pefindoNotes: '',
  lenderExposures: [],

  // 7. PRELIMINARY ASSESSMENT
  goodProject: false,
  goodProjectNote: '',
  goodCustomer: false,
  goodCustomerNote: '',
  recommendation: '',
  briefNote: '',
  suggestions: [],
  competitionNotes: '',
  competitionTable: [],
  proposedBy: '',
  reviewedBy: '',
  approvedBy: '',
  signatories: [
    {id: 'sig-1', role: 'Propose by :', name: '', position: ''},
    {id: 'sig-2', role: 'Reviewed by :', name: '', position: ''},
    {id: 'sig-3', role: 'Approved by :', name: '', position: ''},
  ],
};
