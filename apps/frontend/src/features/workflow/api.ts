/** Workflow setup API (administrators). The definition is edited as one object and saved whole (every save makes a new frozen copy). */
import {api} from '@/shared/lib/api';

/** Items refer to each other by `key`; for a saved item the key is its code, for a new one the page makes a temporary key. */
export type Group = {key: string; code?: string | null; name: string; order: number};
export type Stage = {key: string; code?: string | null; groupKey: string; name: string; departmentCode?: string | null; order: number; formCode?: string | null};
export type FieldRule = {stageKey: string; formCode: string; section: string; code: string; mandatory: boolean};
export type DocRule = {stageKey: string; documentCode: string; isDefault: boolean; isMandatory: boolean};
/**
 * The approval of a place: the code of a master approval (made in Master approval). GROUP needs groupKey, STAGE needs stageKey, SECTION
 * needs stageKey and sectionCode, DOCUMENT needs stageKey and documentCode. A place has one approval; many places may use the same one.
 */
export type ApprovalAssignment = {
  scope: 'GROUP' | 'STAGE' | 'SECTION' | 'DOCUMENT';
  groupKey?: string | null;
  stageKey?: string | null;
  sectionCode?: string | null;
  documentCode?: string | null;
  approvalCode: string;
};
/** A master approval: levels run in ascending levelNo; the same levelNo is approved at the same time. A level names an authority of User Management. */
export type MasterApproval = {
  code: string;
  name: string;
  /** Applications running on a workflow freeze that uses this approval. */
  applications?: number;
  description?: string | null;
  usedIn?: number;
  /** A level whose approver is the PIC Marketing of the application has isPicMarketing and no authority. */
  levels: {levelNo: number; authorityName: string; isPicMarketing?: boolean}[];
};
export type Definition = {
  groups: Group[];
  stages: Stage[];
  fields: FieldRule[];
  documents: DocRule[];
  approvals: ApprovalAssignment[];
};
export type WorkflowHeader = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** The one workflow new applications start in (its newest freeze). */
  isActive: boolean;
  /** The number and time of the newest freeze (every create or edit makes a new one). */
  freezeVersion: number | null;
  frozenAt: string | null;
  applications?: number;
  /** Groups in running order with their stages (list only). Same order = run together. */
  flow?: {name: string; order: number; stages: {name: string; order: number}[]}[];
};
export type CatalogField = {formCode: string; section: string; sectionCode?: string; code: string; label: string; enforceable: boolean};
export type Catalog = {
  formFields: CatalogField[];
  /** isApproval = the place may have an approval (the flag in the masters: the registry). */
  forms: {code: string; name: string; isApproval: boolean}[];
  sections: {formCode: string; code: string; name: string; isApproval: boolean; isRepeating: boolean}[];
  documents: {code: string; name: string; isApproval: boolean}[];
  departments: {code: string; name: string}[];
  approvals: MasterApproval[];
};
export type Issue = {level: 'error' | 'warning'; message: string};

/** What a level row is called on screen. */
export const approverLabel = (l: {authorityName: string; isPicMarketing?: boolean}) => (l.isPicMarketing ? 'PIC Marketing' : l.authorityName);

export const emptyDefinition = (): Definition => ({groups: [], stages: [], fields: [], documents: [], approvals: []});

export const workflowApi = {
  list: (): Promise<WorkflowHeader[]> => api('/workflows'),
  catalog: (): Promise<Catalog> => api('/workflows/catalog'),
  get: (id: string): Promise<{workflow: WorkflowHeader; definition: Definition}> => api(`/workflows/${id}`),
  create: (body: {name: string; description?: string}): Promise<{workflow: WorkflowHeader; definition: Definition}> => api('/workflows', 'POST', body),
  rename: (id: string, body: {name?: string; description?: string | null}) => api(`/workflows/${id}`, 'PUT', body),
  saveDefinition: (id: string, definition: Definition) => api(`/workflows/${id}/definition`, 'PUT', definition),
  validate: (id: string): Promise<{ok: boolean; issues: Issue[]}> => api(`/workflows/${id}/validate`, 'POST', {}),
  activate: (id: string) => api(`/workflows/${id}/activate`, 'POST', {}),
  deactivate: (id: string) => api(`/workflows/${id}/deactivate`, 'POST', {}),
  /** Deletes the workflow; its frozen copies stay. */
  remove: (id: string): Promise<{removed: string}> => api(`/workflows/${id}`, 'DELETE'),
  /** The frozen copies of a workflow, newest first. */
  history: (id: string): Promise<{id: string; freezeVersion: number; at: string; by: string | null; name: string; isLatest: boolean; applications: number}[]> =>
    api(`/workflows/${id}/history`),
};
