/** What the current user may see and do in the workspace: tabs, edit rights, workflow buttons and lock state. */
import {useEffect} from 'react';
import {isPreAnalysisReached} from '@/features/applications/lib/workspace/stage';
import {
  stageTabOrder,
  TAB_NUMBERS,
  TAB_VIEW_AUTHORITY,
  TABS,
} from '@/features/applications/lib/workspace/tabs';
import {workflowActions} from '@/features/applications/lib/workspace/workflow-actions';
import {checkIsAdmin, hasAuthority} from '@/shared/lib/auth';

export function useWorkspaceAccess({
  a,
  user,
  draft,
  activeStage,
  tab,
  setTab,
}: {
  a: any;
  user: any;
  draft: any;
  activeStage: string;
  tab: number;
  setTab: (v: number) => void;
}) {
  const isFapStage = activeStage === 'FAP Stage';
  const fapChk = (a.documentChecks || []).find(
    (d: any) =>
      String(d.documentCode).toUpperCase() === 'FAP' || String(d.documentName).toLowerCase() === 'fap',
  );
  const hasSignedFap = Boolean(fapChk && Array.isArray(fapChk.files) && fapChk.files.length > 0);
  const isDbLocked = a.submitLock !== undefined ? Number(a.submitLock.isLocked) === 1 : !hasSignedFap;
  const isSubmitLocked = !draft.isNew && isDbLocked;
  const preAnalysisReached = isPreAnalysisReached(a, draft);
  const currentAppStage = preAnalysisReached ? 'Pre-analysis' : 'FAP Stage';

  const stageOrder = stageTabOrder(activeStage);
  const tabOrder = stageOrder.filter(id => hasAuthority(user, TAB_VIEW_AUTHORITY[id]));
  useEffect(() => {
    if (tabOrder.length && !tabOrder.includes(tab)) setTab(tabOrder[0]);
  }, [tabOrder.join(','), tab]);

  const isAdminUser = checkIsAdmin(user);
  // FAP Stage is fully editable at all times per specification
  const isFapLocked = false;
  // What the user may edit comes from the authorities of their DB role (administrators have all)
  const canLegal = hasAuthority(user, 'crm_edit_app_legal');
  const canEditCustomerPic = hasAuthority(user, 'crm_edit_app_customer_pic');
  const canEdit = hasAuthority(user, 'crm_edit_app_business_banks');
  const canFinance =
    hasAuthority(user, 'crm_edit_app_financial') || hasAuthority(user, 'crm_edit_app_financing_units');

  return {
    isFapStage,
    fapChk,
    hasSignedFap,
    isDbLocked,
    isSubmitLocked,
    isPreAnalysisReached: preAnalysisReached,
    currentAppStage,
    tabs: TABS,
    tabNumbers: TAB_NUMBERS,
    stageTabOrder: stageOrder,
    tabOrder,
    isAdminUser,
    isFapLocked,
    canLegal,
    canEditCustomerPic,
    canEdit,
    canFinance,
    actions: workflowActions(user, a.status),
  };
}
