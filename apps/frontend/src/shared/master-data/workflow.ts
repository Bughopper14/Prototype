/**
 * Workflow stages (of the active workflow) and the four states an application can be in (IN_PROGRESS, IN_APPROVAL, REJECTED,
 * APPROVED), from the master catalog. The state is worked out by the backend from the approval rounds; who may approve a step is
 * decided by the authority of that step (a.approval), nothing about the workflow is hardcoded here.
 */
import {screenOfForm, type MasterCatalog, type MasterItem} from '@liugong/shared';
import {currentMasterData} from './catalog/store';

const statuses = (catalog: MasterCatalog = currentMasterData()) => catalog.workflowStatus || [];
const stages = (catalog: MasterCatalog = currentMasterData()) =>
  [...(catalog.workflowStage || [])].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

export const workflowStatuses = (catalog?: MasterCatalog): MasterItem[] => statuses(catalog);
export const workflowStages = (catalog?: MasterCatalog): MasterItem[] => stages(catalog);

/** Display name of a status code (falls back to the code). */
export const statusName = (code?: string | null, catalog?: MasterCatalog) =>
  (code && statuses(catalog).find(s => s.value === code)?.name) || code || '';

/** The state a new application starts in. */
export const initialStatusCode = () => 'IN_PROGRESS';

export const isTerminalStatus = (code?: string | null, catalog?: MasterCatalog) =>
  !!code && statuses(catalog).some(s => s.value === code && s.terminal);

/**
 * The screens the workspace has, one per kind of form (see screenOfForm in @liugong/shared): the FAP form, the Pre-analysis form, and the shared document
 * screens of any other form. They are not stage codes: a stage opens the screen of ITS form, so a workflow can name its stages as it likes.
 */
export const SCREEN = {FAP: 'FAP', PRE_ANALYSIS: 'PRE_ANALYSIS', DOCUMENTS: 'DOCUMENTS'} as const;

/** The screen a workflow stage opens, decided by the form of the stage. */
export const screenOfStage = (stage: {formCode?: string | null}): string => {
  const screen = screenOfForm(stage.formCode);
  return screen === 'FAP' ? SCREEN.FAP : screen === 'PRE_ANALYSIS' ? SCREEN.PRE_ANALYSIS : SCREEN.DOCUMENTS;
};

/** The screen of the stage with this code in the workflow of the application (undefined when the application has no such stage, e.g. an unsaved one). */
export const screenOfStageCode = (a: any, code?: string | null): string | undefined => {
  const stage = ((a?.workflow?.stages || []) as {code: string; formCode?: string | null}[]).find(s => s.code === code);
  return stage ? screenOfStage(stage) : undefined;
};

/** Display name of a stage code (falls back to the code). */
export const stageName = (code?: string | null, catalog?: MasterCatalog) =>
  (code && stages(catalog).find(s => s.value === code)?.name) || code || '';

/** The stage a new (unsaved) application opens in: the first stage of the workflow. */
export const firstStageCode = (catalog?: MasterCatalog) => stages(catalog)[0]?.value || '';
