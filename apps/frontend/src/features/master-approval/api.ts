import type {ApplicationsPage} from '@/shared/ui/ApplicationsDialog';
import type {TimelineVersion} from '@/shared/ui/VersionTimeline';
/** Master approval API (administrators): approvals that stand on their own. A workflow only points at an approval code. */
import {api} from '@/shared/lib/api';
import type {MasterApproval} from '@/features/workflow/api';

export type {MasterApproval};
export type ApprovalLevelInput = {levelNo: number; authorityName: string; isPicMarketing?: boolean};
export type ApprovalInput = {name: string; description?: string | null; levels: ApprovalLevelInput[]};
/** Where an approval is used: the workflow and the place in it, in words. */
export type ApprovalUse = {workflowCode: string; workflowName: string; scope: string; place: string};
export type ApprovalDetail = MasterApproval & {usedBy: ApprovalUse[]};
/** One line of the log of an approval: who did what and when (created, edited, removed). */
export type ApprovalLog = {
  action: string;
  summary: string;
  before: string | null;
  after: string | null;
  at: string;
  by: string | null;
};
export type ApprovalWorkflow = {id: string; name: string};
export type AuthorityChoice = {appId: number; name: string; description: string};

export interface ApprovalVersion extends TimelineVersion {
  name: string;
  levels: {levelNo: number; label: string}[];
  workflows: {freezeId: string; name: string; freezeVersion: number; places: string[]}[];
}

export const masterApprovalApi = {
  list: (): Promise<(MasterApproval & {workflows: ApprovalWorkflow[]})[]> => api('/master-approvals'),
  /** The authorities a level can use (made in User Management; their name starts with CRM_ and ends with APPROVE, APPROVAL or APPROVER). */
  authorities: (): Promise<AuthorityChoice[]> => api('/master-approvals/authorities'),
  get: (code: string): Promise<ApprovalDetail> => api(`/master-approvals/${encodeURIComponent(code)}`),
  create: (body: ApprovalInput): Promise<ApprovalDetail> => api('/master-approvals', 'POST', body),
  update: (code: string, body: ApprovalInput): Promise<ApprovalDetail> =>
    api(`/master-approvals/${encodeURIComponent(code)}`, 'PUT', body),
  remove: (code: string): Promise<{removed: string}> =>
    api(`/master-approvals/${encodeURIComponent(code)}`, 'DELETE'),
  history: (
    code: string,
  ): Promise<
    {
      action: string;
      summary: string;
      before: string | null;
      after: string | null;
      at: string;
      by: string | null;
    }[]
  > => api(`/master-approvals/${encodeURIComponent(code)}/history`),
  /** The applications running on the workflows that use one version of an approval (paged, searchable). */
  versionApplications: (code: string, freezeId: string, q: string, page: number): Promise<ApplicationsPage> =>
    api(`/master-approvals/${encodeURIComponent(code)}/versions/${freezeId}/applications?q=${encodeURIComponent(q)}&page=${page}`),
  /** The versions of an approval, what changed in each, and where each one is used. */
  versions: (code: string): Promise<ApprovalVersion[]> =>
    api(`/master-approvals/${encodeURIComponent(code)}/versions`),
};
