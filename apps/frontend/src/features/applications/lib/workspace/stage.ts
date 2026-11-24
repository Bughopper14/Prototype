/** Which stage and screen an application is in, worked out from its stage field and the form of each stage of its workflow. */
import {firstStageCode, SCREEN, screenOfStage, screenOfStageCode} from '@/shared/master-data';

/** The application has been submitted past the FAP stage: the stage it is in opens the Pre-analysis screen. */
export const isPreAnalysisApplication = (a: any) => screenOfStageCode(a, a.stage) === SCREEN.PRE_ANALYSIS;

/** Same, but the unsaved draft counts too. */
export const isPreAnalysisReached = (a: any, draft: any) => isPreAnalysisApplication(a) || screenOfStageCode(a, draft.stage) === SCREEN.PRE_ANALYSIS;

/** The screen to show when the application is opened: the screen of its stage (the FAP screen for an application that has none yet). */
export const initialScreen = (a: any) => screenOfStageCode(a, a.stage || firstStageCode()) ?? SCREEN.FAP;

/** A stage of the workflow an application runs in (from the backend). */
export type WorkflowStage = {code: string; name: string; groupCode: string; formCode: string | null; order: number};

/** The screen a workflow stage opens, decided by the form of the stage (see screenOfStage). The code or name of the stage never decides it. */
export const screenOf = (stage: {code: string; formCode?: string | null}): string => screenOfStage(stage);
