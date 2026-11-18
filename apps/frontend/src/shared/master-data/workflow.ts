/**
 * Workflow stages and statuses from Master Data (crm_master_workflow_stages / _statuses). Which actions a user may
 * take comes from the backend (availableActions); nothing about the workflow is hardcoded here.
 */
import type {MasterCatalog, MasterItem} from '@liugong/shared';
import {currentMasterData} from './catalog/store';

const statuses = (catalog: MasterCatalog = currentMasterData()) => catalog.workflowStatus || [];
const stages = (catalog: MasterCatalog = currentMasterData()) =>
  [...(catalog.workflowStage || [])].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

export const workflowStatuses = (catalog?: MasterCatalog): MasterItem[] => statuses(catalog);
export const workflowStages = (catalog?: MasterCatalog): MasterItem[] => stages(catalog);

/** Display name of a status code (falls back to the code). */
export const statusName = (code?: string | null, catalog?: MasterCatalog) =>
  (code && statuses(catalog).find(s => s.value === code)?.name) || code || '';

/** The status every new application starts in: the first status of the first stage. */
export const initialStatusCode = (catalog?: MasterCatalog) => {
  const first = stages(catalog)[0];
  return statuses(catalog).find(s => s.parentValue === first?.value)?.value || '';
};

/** The status belongs to the first stage (the FAP form is still being prepared or was returned). */
export const isFirstStageStatus = (code?: string | null, catalog?: MasterCatalog) => {
  const first = stages(catalog)[0];
  return !!code && statuses(catalog).some(s => s.value === code && s.parentValue === first?.value);
};

export const isTerminalStatus = (code?: string | null, catalog?: MasterCatalog) =>
  !!code && statuses(catalog).some(s => s.value === code && s.terminal);

/**
 * Stage codes the workspace has screens for (crm_master_workflow_stages.code). Codes identify a stage in code; the
 * names shown on screen always come from Master Data, so renaming a stage never breaks a screen.
 */
export const STAGE = {FAP: 'FAP-STAGE', PRE_ANALYSIS: 'PRE-ANALYSIS', ICLF: 'ICLF'} as const;

/** Display name of a stage code (falls back to the code). */
export const stageName = (code?: string | null, catalog?: MasterCatalog) =>
  (code && stages(catalog).find(s => s.value === code)?.name) || code || '';

/** The stage a new (unsaved) application opens in: the first stage of the workflow. */
export const firstStageCode = (catalog?: MasterCatalog) => stages(catalog)[0]?.value || STAGE.FAP;
