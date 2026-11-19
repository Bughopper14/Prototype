/** Workflow setup API (administrators). The definition is edited as one object and saved whole (a draft no application uses). */
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
  /** Only an ACTIVE approval can be chosen for a place. */
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  activatedAt?: string | null;
  activatedBy?: string | null;
  /** Applications still running on a workflow that uses this approval. */
  applications?: number;
  description?: string | null;
  usedIn?: number;
  levels: {levelNo: number; authorityName: string}[];
};
export type Definition = {
  groups: Group[];
  stages: Stage[];
  fields: FieldRule[];
  documents: DocRule[];
  approvals: ApprovalAssignment[];
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

export const emptyDefinition = (): Definition => ({groups: [], stages: [], fields: [], documents: [], approvals: []});

export const workflowApi = {
  list: (): Promise<WorkflowHeader[]> => api('/workflows'),
  catalog: (): Promise<Catalog> => api('/workflows/catalog'),
  get: (id: string): Promise<{workflow: WorkflowHeader; definition: Definition}> => api(`/workflows/${id}`),
  create: (body: {name: string; description?: string}): Promise<{workflow: WorkflowHeader; definition: Definition}> => api('/workflows', 'POST', body),
  /** A new draft with the same groups, stages, fields, documents and approvals (a workflow in use is changed by cloning it). */
  clone: (id: string): Promise<{workflow: WorkflowHeader; definition: Definition}> => api(`/workflows/${id}/clone`, 'POST', {}),
  rename: (id: string, body: {name?: string; description?: string | null}) => api(`/workflows/${id}`, 'PUT', body),
  saveDefinition: (id: string, definition: Definition) => api(`/workflows/${id}/definition`, 'PUT', definition),
  validate: (id: string): Promise<{ok: boolean; issues: Issue[]}> => api(`/workflows/${id}/validate`, 'POST', {}),
  activate: (id: string, note?: string) => api(`/workflows/${id}/activate`, 'POST', {note}),
  deactivate: (id: string, note?: string) => api(`/workflows/${id}/deactivate`, 'POST', {note}),
  history: (id: string): Promise<{action: string; actor: string; note: string | null; at: string; previous: string | null}[]> =>
    api(`/workflows/${id}/history`),
};
