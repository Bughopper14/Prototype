/** Which stage an application is in, worked out from its stage field and workflow status. */
import {screenOfForm} from '@liugong/shared';
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
 * The screen a workflow stage opens, decided by the form of the stage (see screenOfForm in @liugong/shared): the FAP form shows the FAP tabs,
 * the Pre-analysis form the Pre-analysis tabs, any other form the shared document tabs. The code or name of the stage never decides it.
 */
export const screenOf = (stage: {code: string; formCode?: string | null}): string => {
  const screen = screenOfForm(stage.formCode);
  return screen === 'FAP' ? STAGE.FAP : screen === 'PRE_ANALYSIS' ? STAGE.PRE_ANALYSIS : STAGE.ICLF;
};
