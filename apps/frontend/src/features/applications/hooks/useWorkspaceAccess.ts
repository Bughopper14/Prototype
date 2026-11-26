/** What the current user may see and do in the workspace: tabs, edit rights, workflow buttons and lock state. */
import {screenOfForm} from '@liugong/shared';
import {useEffect} from 'react';
import {isPreAnalysisReached} from '@/features/applications/lib/workspace/stage';
import {
  stageTabOrder,
  TAB_NUMBERS,
  TAB_VIEW_AUTHORITY,
  TABS,
} from '@/features/applications/lib/workspace/tabs';
import {checkIsAdmin, hasAuthority} from '@/shared/lib/auth';
import {SCREEN, screenOfStage, useMasterData, workflowStages} from '@/shared/master-data';

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
  const isFapStage = activeStage === SCREEN.FAP;
  const preAnalysisReached = isPreAnalysisReached(a, draft);
  // The stage the workspace is showing, or the stage of the application's status when that is a later one (for example
  // ICLF, which has no screen of its own yet): "Active Stage" names the stage the application is really in.
  const master = useMasterData();
  const appStages: {code: string; formCode?: string | null}[] = a?.workflow?.stages || [];
  const stageCodes = appStages.length ? appStages.map(s => s.code) : workflowStages(master).map(s => s.value);
  // the stage the workspace shows is the first stage of the workflow whose form opens that screen (never a fixed code)
  const viewScreen = preAnalysisReached ? SCREEN.PRE_ANALYSIS : SCREEN.FAP;
  const viewStage = appStages.find(s => screenOfStage(s) === viewScreen)?.code ?? stageCodes[0] ?? '';
  const realStage: string | undefined = a.workflowStage?.code;
  const currentAppStage =
    realStage && stageCodes.indexOf(realStage) > stageCodes.indexOf(viewStage) ? realStage : viewStage;

  // The FAP form tabs (FAP Form, Legal, Stakeholders) belong to the FAP-FORM stage: a workflow without that form does not show them.
  const workflowStagesOfApp: {formCode?: string | null}[] = a?.workflow?.stages || [];
  const usesFapForm = !workflowStagesOfApp.length || workflowStagesOfApp.some(s => screenOfForm(s.formCode) === 'FAP');
  const stageOrder = stageTabOrder(activeStage).filter(id => usesFapForm || ![0, 1, 5].includes(id));
  // The Approvals tab (10) is for the people who approve: administrators, and whoever holds the authority of a step of this application's approval
  // rounds (open or finished). The backend decides it (`approval.involved`); someone who may only view the application does not get the tab.
  const takesPartInApproval = Boolean(a.approval?.involved);
  const tabOrder = stageOrder.filter(id => hasAuthority(user, TAB_VIEW_AUTHORITY[id]) && (id !== 10 || takesPartInApproval));
  useEffect(() => {
    if (tabOrder.length && !tabOrder.includes(tab)) setTab(tabOrder[0]);
  }, [tabOrder.join(','), tab]);

  const isAdminUser = checkIsAdmin(user);
  // isFapLocked belongs to the signed FAP document (its upload); the lock of the form itself is fapFormLocked below
  const isFapLocked = false;

  // Any document in checklist in approval or approved locks editing:
  const isChecklistInApproval = (a?.documentChecks || []).some(
    (d: any) =>
      (d.approvalStatus === 'IN_APPROVAL' || d.approval?.state === 'IN_APPROVAL') &&
      d.approval?.state !== 'REJECTED',
  );
  const fapCheck = (a?.documentChecks || []).find((d: any) => d.documentCode === 'FAP');
  const isFapDocInApproval =
    fapCheck?.approvalStatus === 'IN_APPROVAL' ||
    fapCheck?.approval?.state === 'IN_APPROVAL' ||
    fapCheck?.approvalStatus === 'APPROVED' ||
    fapCheck?.approval?.state === 'APPROVED';

  // Submitting the stage that shows the FAP form or submitting document checklist locks the form (profile, contact person, legal deeds/stakeholders, and sections 05-08); a rejection of the stage/document opens it again.
  const fapFormLocked = Boolean(a?.fapFormLocked) || isFapDocInApproval || isChecklistInApproval;
  // What the user may edit comes from the authorities of their DB role and approval state
  const canLegal = hasAuthority(user, 'CRM_LEGAL_EDIT') && !fapFormLocked;
  const canEditCustomerPic = hasAuthority(user, 'CRM_CUSTOMER-PIC_EDIT') && !fapFormLocked;
  const canEdit = hasAuthority(user, 'CRM_BUSINESS-BANK_EDIT') && !fapFormLocked;
  const canFinance =
    hasAuthority(user, 'CRM_FINANCIAL_EDIT') || hasAuthority(user, 'CRM_FINANCING-UNIT_EDIT');
  const canProposal = canFinance && !fapFormLocked;

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
    canProposal,
    fapFormLocked,
  };
}
