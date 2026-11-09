/** Pre-analysis data shapes (milestones, units, lenders, group structure, SLIK review…). */

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
  holdingGroup: string;
  projectName: string;
  projectLocation: string;
  existingProjects: string;
  newProjects: string;
  projectNameLocation?: string;
  customerRole: string;
  otherContractors: string;
  projectOwner: string;
  bowheerInfo: string;
  projectStatus: string;
  investmentPlan: string;
  financingSchemeRequested: string;

  // 3. CUSTOMER & GROUP BACKGROUND
  ubo?: string;
  uboInfo: string;
  companyBackground: string;
  starGroupMilestonesNarrative?: string;
  businessDevBackground?: string;
  operationalTeamInfo?: string;
  uboInformation?: string;
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

  // 7. EXPERT JUDGEMENT CONCLUSION
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
}
