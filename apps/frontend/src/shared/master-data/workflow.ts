/**
 * Workflow stages (of the active workflow) and the four states an application can be in (IN_PROGRESS, IN_APPROVAL, REJECTED,
 * APPROVED), from the master catalog. The state is worked out by the backend from the approval rounds; who may approve a step is
 * decided by the authority of that step (a.approval), nothing about the workflow is hardcoded here.
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

/** The state a new application starts in. */
export const initialStatusCode = () => 'IN_PROGRESS';

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
