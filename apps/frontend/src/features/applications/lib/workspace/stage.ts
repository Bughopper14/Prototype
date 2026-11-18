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

/** A stage of the workflow an application runs in (from the backend). */
export type WorkflowStage = {code: string; name: string; groupCode: string; formCode: string | null; order: number};

/**
 * The screen a workflow stage opens: the FAP form stage shows the FAP tabs, the Pre-analysis stage the Pre-analysis tabs,
 * and any other stage the shared document tabs. (There is no Pre-analysis form in the field catalog yet, so that stage
 * is recognised by its code.)
 */
export const screenOf = (stage: {code: string; formCode?: string | null}): string =>
  stage.formCode === 'FAP-FORM' ? STAGE.FAP : stage.code === STAGE.PRE_ANALYSIS ? STAGE.PRE_ANALYSIS : STAGE.ICLF;
