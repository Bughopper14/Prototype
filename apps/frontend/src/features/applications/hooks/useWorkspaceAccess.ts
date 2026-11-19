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
  // The Approvals tab (10) is for the people who approve: administrators, and whoever holds the authority of a step of this application's approval
  // rounds (open or finished). Someone who may only view the application does not get it.
  const roundSteps: any[] = [...(a.approval?.current || []), ...(a.approval?.history || [])].flatMap((c: any) => c.steps || []);
  const takesPartInApproval = checkIsAdmin(user) || roundSteps.some(st => (user?.authorities || []).includes(st.authorityName));
  const tabOrder = stageOrder.filter(id => hasAuthority(user, TAB_VIEW_AUTHORITY[id]) && (id !== 10 || takesPartInApproval));
  useEffect(() => {
    if (tabOrder.length && !tabOrder.includes(tab)) setTab(tabOrder[0]);
  }, [tabOrder.join(','), tab]);

  const isAdminUser = checkIsAdmin(user);
  // FAP Stage is fully editable at all times per specification
  const isFapLocked = false;
  // What the user may edit comes from the authorities of their DB role (administrators have all)
  const canLegal = hasAuthority(user, 'CRM_LEGAL_EDIT');
  const canEditCustomerPic = hasAuthority(user, 'CRM_CUSTOMER-PIC_EDIT');
  const canEdit = hasAuthority(user, 'CRM_BUSINESS-BANK_EDIT');
  const canFinance =
    hasAuthority(user, 'CRM_FINANCIAL_EDIT') || hasAuthority(user, 'CRM_FINANCING-UNIT_EDIT');

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
  };
}
