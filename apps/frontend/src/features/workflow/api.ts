/** Workflow setup API (administrators). The definition is edited as one object and saved whole (a draft no application uses). */
import {api} from '@/shared/lib/api';

/** Items refer to each other by `key`; for a saved item the key is its code, for a new one the page makes a temporary key. */
export type Group = {key: string; code?: string | null; name: string; order: number};
export type Stage = {key: string; code?: string | null; groupKey: string; name: string; departmentCode?: string | null; order: number; formCode?: string | null};
export type FieldRule = {stageKey: string; formCode: string; section: string; code: string; mandatory: boolean};
export type DocRule = {stageKey: string; documentCode: string; isDefault: boolean; isMandatory: boolean};
/** What an approval step approves: GROUP needs groupKey, STAGE needs stageKey, DOCUMENT needs stageKey and documentCode. */
export type ApprovalStep = {
  key: string;
  code?: string | null;
  name: string;
  scope: 'GROUP' | 'STAGE' | 'DOCUMENT';
  groupKey?: string | null;
  stageKey?: string | null;
  documentCode?: string | null;
  order: number;
  /** The authority that guards the step: an existing authority of User Management (names ending with _APPROVE). */
  authorityName: string;
  /** False when the authority was removed from User Management after the workflow was saved. */
  authorityExists?: boolean;
};
export type Definition = {
  groups: Group[];
  stages: Stage[];
  fields: FieldRule[];
  documents: DocRule[];
  approvalSteps: ApprovalStep[];
};
export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type WorkflowHeader = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  versionNo: number;
  status: WorkflowStatus;
  isActive: boolean;
  /** Only a draft that no application uses can be edited. */
  editable: boolean;
  activatedAt: string | null;
  activatedBy: string | null;
  applications?: number;
  /** Groups in running order with their stages (list only). Same order = run together. */
  flow?: {name: string; order: number; stages: {name: string; order: number}[]}[];
};
export type CatalogField = {formCode: string; section: string; code: string; label: string; enforceable: boolean};
export type Catalog = {
  formFields: CatalogField[];
  forms: {code: string; name: string}[];
  documents: {code: string; name: string}[];
  departments: {code: string; name: string}[];
  /** The authorities that may be chosen for each place (a group, a stage or one document of a stage). */
  authorityOptions: {scope: 'GROUP' | 'STAGE' | 'DOCUMENT'; formCode: string | null; documentCode: string | null; departmentCode: string; authorityName: string; description: string}[];
};
export type Issue = {level: 'error' | 'warning'; message: string};

export const emptyDefinition = (): Definition => ({groups: [], stages: [], fields: [], documents: [], approvalSteps: []});

export const workflowApi = {
  list: (): Promise<WorkflowHeader[]> => api('/workflows'),
  catalog: (): Promise<Catalog> => api('/workflows/catalog'),
  get: (id: string): Promise<{workflow: WorkflowHeader; definition: Definition}> => api(`/workflows/${id}`),
  create: (body: {name: string; description?: string}): Promise<{workflow: WorkflowHeader; definition: Definition}> => api('/workflows', 'POST', body),
  rename: (id: string, body: {name?: string; description?: string | null}) => api(`/workflows/${id}`, 'PUT', body),
  saveDefinition: (id: string, definition: Definition) => api(`/workflows/${id}/definition`, 'PUT', definition),
  validate: (id: string): Promise<{ok: boolean; issues: Issue[]}> => api(`/workflows/${id}/validate`, 'POST', {}),
  activate: (id: string, note?: string) => api(`/workflows/${id}/activate`, 'POST', {note}),
  deactivate: (id: string, note?: string) => api(`/workflows/${id}/deactivate`, 'POST', {note}),
  history: (id: string): Promise<{action: string; actor: string; note: string | null; at: string; previous: string | null}[]> =>
    api(`/workflows/${id}/history`),
};
