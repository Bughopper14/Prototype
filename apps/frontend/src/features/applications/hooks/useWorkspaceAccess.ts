/** What the current user may see and do in the workspace: tabs, edit rights, workflow buttons and lock state. */
import {useEffect} from 'react';
import {isPreAnalysisReached} from '@/features/applications/lib/workspace/stage';
import {
  stageTabOrder,
  TAB_NUMBERS,
  TAB_VIEW_AUTHORITY,
  TABS,
} from '@/features/applications/lib/workspace/tabs';
import {checkIsAdmin, hasAuthority} from '@/shared/lib/auth';
import {STAGE, useMasterData, workflowStages} from '@/shared/master-data';

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
  const isFapStage = activeStage === STAGE.FAP;
  const preAnalysisReached = isPreAnalysisReached(a, draft);
  // The stage the workspace is showing, or the stage of the application's status when that is a later one (for example
  // ICLF, which has no screen of its own yet): "Active Stage" names the stage the application is really in.
  const master = useMasterData();
  const stageCodes = workflowStages(master).map(s => s.value);
  const viewStage = preAnalysisReached ? STAGE.PRE_ANALYSIS : STAGE.FAP;
  const realStage: string | undefined = a.workflowStage?.code;
  const currentAppStage =
    realStage && stageCodes.indexOf(realStage) > stageCodes.indexOf(viewStage) ? realStage : viewStage;

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
    actions: (a.availableActions || []) as string[],
  };
}
