/** The tabs of the application workspace: names, numbering, order per stage and the authority needed to view each. */
import {STAGE} from '@/shared/master-data';
/** Tab id → name. The ids are stored with activity entries (tab_index), so they never change. */
export const TABS: Record<number, string> = {
  0: 'FAP Form',
  1: 'Stakeholders',
  4: 'Financial statements',
  5: 'Legal',
  6: 'Documents',
  7: 'Activity',
  8: 'Pre Analysis form',
  9: 'Document Checklist',
  10: 'Approvals',
  11: 'Submit',
};

export const TAB_NUMBERS: Record<number, number> = {0: 1, 5: 2, 1: 3, 6: 5, 9: 6, 7: 7, 8: 1, 4: 2, 10: 8, 11: 9};

/**
 * Tab ids shown in each stage. References, financing proposal and financial statements are part of the
 * FAP form (sections 07-09), so "Business & banks" is no longer a tab of its own.
 */
export function stageTabOrder(activeStage: string): number[] {
  if (activeStage === STAGE.FAP) return [0, 5, 1, 6, 9, 11, 10, 7];
  if (activeStage === STAGE.PRE_ANALYSIS) return [8, 4, 6, 9, 11, 10, 7];
  return [6, 9, 11, 10, 7];
}

/** A tab is only offered when the user's role may view that section. */
export const TAB_VIEW_AUTHORITY: Record<number, string> = {
  0: 'crm_view_app_customer_pic',
  1: 'crm_view_app_stakeholders',
  4: 'crm_view_app_financial',
  5: 'crm_view_app_legal',
  6: 'crm_view_app_documents',
  7: 'crm_view_app_activity',
  8: 'crm_view_applications',
  9: 'crm_view_app_documents',
  10: 'crm_view_applications',
  11: 'crm_workflow_submit',
};
