/** The workflow buttons a user may press for an application in a given status. */
import {checkIsAdmin, hasAuthority} from '@/shared/lib/auth';

export function workflowActions(user: any, status: string): string[] {
  let actions: string[] = [];
  if (checkIsAdmin(user)) {
    if (['DRAFT', 'RETURNED'].includes(status)) actions = ['SUBMIT_TO_BS'];
    else if (status === 'SUBMITTED_TO_BS') actions = ['VERIFY_BS', 'RETURN'];
    else if (status === 'BS_VERIFIED') actions = ['START_REVIEW', 'RETURN'];
    else if (status === 'IN_CA_LEGAL_REVIEW') actions = ['RECOMMEND_CA', 'RECOMMEND_LEGAL', 'RETURN'];
    else if (status === 'CREDIT_COMMITTEE_REVIEW')
      actions = ['APPROVE_COMMITTEE', 'REJECT_COMMITTEE', 'RETURN'];
  } else {
    const can = (authority: string) => hasAuthority(user, authority);
    if (['DRAFT', 'RETURNED'].includes(status)) {
      if (can('crm_workflow_submit')) actions = ['SUBMIT_TO_BS'];
    } else {
      if (status === 'SUBMITTED_TO_BS' && can('crm_workflow_verify_documents')) actions = ['VERIFY_BS'];
      if (status === 'BS_VERIFIED' && can('crm_workflow_start_review')) actions = ['START_REVIEW'];
      if (status === 'IN_CA_LEGAL_REVIEW')
        actions = [
          ...(can('crm_workflow_recommend_credit') ? ['RECOMMEND_CA'] : []),
          ...(can('crm_workflow_recommend_legal') ? ['RECOMMEND_LEGAL'] : []),
        ];
      if (status === 'CREDIT_COMMITTEE_REVIEW' && can('crm_workflow_final_decision'))
        actions = ['APPROVE_COMMITTEE', 'REJECT_COMMITTEE'];
      if (actions.length && can('crm_workflow_return')) actions = [...actions, 'RETURN'];
    }
  }
  return actions;
}
