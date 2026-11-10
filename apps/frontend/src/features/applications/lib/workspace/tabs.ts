/** The tabs of the application workspace: names, numbering, order per stage and the authority needed to view each. */
export const TABS = [
  'FAP Form',
  'Stakeholders',
  'Business & banks',
  'Financing & units',
  'Financial statements',
  'Legal',
  'Documents',
  'Activity',
  'Pre Analysis form',
  'Document Checklist',
];

export const TAB_NUMBERS: Record<number, number> = {0: 1, 5: 2, 1: 3, 2: 4, 6: 5, 9: 6, 7: 7, 8: 1, 4: 2};

/**
 * Tab ids shown in each stage. References, financing proposal and financial statements are part of the
 * FAP form (sections 07-09), so "Business & banks" is no longer a tab of its own.
 */
export function stageTabOrder(activeStage: string): number[] {
  if (activeStage === 'FAP Stage') return [0, 5, 1, 6, 9, 7];
  if (activeStage === 'Pre-analysis') return [8, 4, 6, 9, 7];
  return [6, 9, 7];
}

/** A tab is only offered when the user's role may view that section. */
export const TAB_VIEW_AUTHORITY: Record<number, string> = {
  0: 'crm_view_app_customer_pic',
  1: 'crm_view_app_stakeholders',
  2: 'crm_view_app_business_banks',
  3: 'crm_view_app_financing_units',
  4: 'crm_view_app_financial',
  5: 'crm_view_app_legal',
  6: 'crm_view_app_documents',
  7: 'crm_view_app_activity',
  8: 'crm_view_applications',
  9: 'crm_view_app_documents',
};
