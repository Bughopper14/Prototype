/** The documents every financing application needs, and which department owns each. */
import type {MasterCatalog} from '@liugong/shared';
import {stageName} from '@/shared/master-data';

export type DocDepartment = 'MKT' | 'BS' | 'CA' | 'LEGAL' | 'COMMITTEE';

export interface MasterDocDef {
  code: string;
  name: string;
  title: string;
  department: DocDepartment;
  isMandatory: boolean;
  defaultSection: string;
  description: string;
  /** Workflow stage the document belongs to (code, and its name from Master Data). */
  stage: string;
  stageName: string;
}

/** Document types from Master Data (crm_master_document_types), in their configured order. */
export function documentDefinitions(master: MasterCatalog): MasterDocDef[] {
  return (master.documents || []).map(x => ({
      code: x.value,
      name: x.name,
      title: x.title || x.name,
      // the department and the mandatory flag of a document come from its workflow (the checklist row)
      department: 'MKT' as DocDepartment,
      isMandatory: false,
      defaultSection: x.section || '',
      description: x.description || '',
      stage: x.stage || '',
      stageName: stageName(x.stage, master),
    }));
}
