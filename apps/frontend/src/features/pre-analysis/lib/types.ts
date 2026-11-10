/** Shapes of the Pre-Analysis data and the props of the form. */

export interface PreAnalysisProjectItem {
  id?: string;
  projectName: string;
  location: string;
  scope: string;
}

export interface PreAnalysisProjectGroup {
  id?: string;
  headName: string;
  projects: PreAnalysisProjectItem[];
}

export type PreAnalysisProjectGroupOrItem = PreAnalysisProjectGroup | PreAnalysisProjectItem;

export interface MilestoneItem {
  year: string;
  milestone?: string;
  entity?: string;
  description?: string;
}

export interface UnitCompItem {
  kategoriAset?: string;
  brand: string;
  type?: string;
  qty: number;
}

export interface LenderExposureItem {
  lender: string;
  plafond: string;
  rate: string;
  notes?: string;
}

export interface CompetitionItem {
  finco: string;
  rate: string;
  purpose: string;
}

export interface GroupShareholder {
  name: string;
  percentage?: string;
  role?: string;
  position?: string;
  shareClass?: string;
  numberOfShares?: string;
  total?: string;
}

export interface GroupEntity {
  name: string;
  subtitle?: string;
  authorizedCapital: string;
  paidUpCapital: string;
  shareholders: GroupShareholder[];
  management?: string;
  borderColor?: string;
}

export interface GroupStructureData {
  holding: GroupEntity;
  subsidiaries: GroupEntity[];
}

export interface EntitySlikReview {
  id?: string;
  entityName: string;
  hasRecord: boolean;
  noRecordRemarks?: string;
  lenderExposures: LenderExposureItem[];
  pefindoNotes?: string;
  pefindoTerms?: string;
}

export interface PreAnalysisData {
  entitySlikReviews?: Record<string, EntitySlikReview>;
  preAnalysisNo: string;
  preAnalysisDate: string;
  customerProjectName: string;
  taxId: string;
  fapNumber: string;
  leadSource: string;
  customerArea: string;
  dealerPic: string;
  lmiPic: string;
  lfiPic: string;
  customerPic: string;
  equity: string;
  paidUpCapital: string;
  sourceOfRepayment: string;

  // 2. PROJECT INFORMATION
  holdingGroup?: string;
  projectName?: string;
  projectLocation?: string;
  existingProjects?: string;
  newProjects?: string;
  currentProjects?: (PreAnalysisProjectGroup | PreAnalysisProjectItem)[];
  historyProjects?: (PreAnalysisProjectGroup | PreAnalysisProjectItem)[];
  investmentProjectPlans?: (PreAnalysisProjectGroup | PreAnalysisProjectItem)[];
  projectNameLocation?: string;
  customerRole: string;
  otherContractors: string;
  projectOwner: string;
  bowheerInfo: string;
  projectStatus: string;
  projectStatusRemarks?: string;
  investmentPlan?: string;
  investmentPlanSelected?: string[];
  investmentPlanRemarks?: Record<string, string>;
  financingSchemeRequested: string;
  // 3. CUSTOMER & GROUP BACKGROUND
  ubo?: string;
  uboInfo: string;
  companyBackground: string;
  starGroupMilestonesNarrative?: string;
  businessDevBackground?: string;
  operationalTeamInfo?: string;
  showUboInformation?: boolean;
  uboInformation?: string;
  groupStructureImage?: string;
  groupStructure?: GroupStructureData;
  milestones: MilestoneItem[];
  existingFincoBackup: string;

  // 4. EQUIPMENT POSSIBILITY OF SUCCESS
  equipmentJobFit: string;
  utilizationDuration: string;
  priorLiugongExperience: string;
  serviceAgreementFmc: string;
  unitComposition: UnitCompItem[];

  // 5. UNIT DELIVERY STATUS & QA CHECK
  deliveryStatus: string;
  deliveryDate: string;
  qaIlinkComment: string;
  qaDocumentName?: string;
  qaDocumentFile?: string;
  qaConclusion: string;

  // 6. CROSS-CHECK WITH DEALER / LMI (quick)
  dealerCheck: string;
  topDealerToCustomer: string;
  topLmiToDealer: string;
  lmiArCheck: string;
  slikPefindoHighlight: string;
  applicantPefindoCheck: string;
  pefindoTerms: string;
  pefindoNotes: string;
  lenderExposures: LenderExposureItem[];

  // 7. PRELIMENARY ASSESSMENT
  goodProject: boolean;
  goodProjectNote: string;
  goodCustomer: boolean;
  goodCustomerNote: string;
  recommendation: string;
  briefNote: string;
  suggestions: string[];
  competitionNotes: string;
  competitionTable: CompetitionItem[];
  proposedBy: string;
  reviewedBy: string;
  approvedBy: string;
  signatureDate?: string;
  signatories?: SignatoryItem[];
}

export interface SignatoryItem {
  id?: string;
  role: string;
  name: string;
  position: string;
  date?: string;
}

export interface PreAnalysisFormProps {
  applicationId: string;
  application?: any;
  customer?: any;
  pic?: any;
  profile?: any;
  isNew?: boolean;
  busy?: boolean;
  assignedPreAnalysisNo?: string;
  onSaveNewApplication?: () => Promise<void>;
  onChange?: (data: PreAnalysisData) => void;
  onSaved?: (diffs?: any[]) => void;
  notify?: (msg: string) => void;
  registerSave?: (saveFn: () => Promise<void>) => void;
  onSavingChange?: (saving: boolean) => void;
}
