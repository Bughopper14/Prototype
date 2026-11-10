/** Which stage an application is in, worked out from its stage field and workflow status. */
export const PRE_ANALYSIS_STATUSES = [
  'SUBMITTED_TO_BS',
  'BS_VERIFIED',
  'IN_CA_LEGAL_REVIEW',
  'CREDIT_COMMITTEE_REVIEW',
  'APPROVED',
];

/** The application has been submitted past the FAP stage. */
export const isPreAnalysisApplication = (a: any) =>
  a.stage === 'Pre-analysis' || PRE_ANALYSIS_STATUSES.includes(a.status);

/** Same, but the unsaved draft counts too. */
export const isPreAnalysisReached = (a: any, draft: any) =>
  a.stage === 'Pre-analysis' || draft.stage === 'Pre-analysis' || PRE_ANALYSIS_STATUSES.includes(a.status);

/** The stage to show when the application is opened. */
export const initialStage = (a: any) =>
  a.stage || (PRE_ANALYSIS_STATUSES.includes(a.status) ? 'Pre-analysis' : 'FAP Stage');
