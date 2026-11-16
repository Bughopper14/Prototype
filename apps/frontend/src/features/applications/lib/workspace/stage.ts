/** Which stage an application is in, worked out from its stage field and workflow status. */
import {STAGE, firstStageCode} from '@/shared/master-data';

/** The application has been submitted past the FAP stage. */
export const isPreAnalysisApplication = (a: any) =>
  a.stage === STAGE.PRE_ANALYSIS;

/** Same, but the unsaved draft counts too. */
export const isPreAnalysisReached = (a: any, draft: any) =>
  a.stage === STAGE.PRE_ANALYSIS || draft.stage === STAGE.PRE_ANALYSIS;

/** The stage to show when the application is opened. */
export const initialStage = (a: any) =>
  a.stage || firstStageCode();
