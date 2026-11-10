/** Works out, for every required document, where it comes from and whether it is there. */
import {MASTER_DOC_DEFINITIONS} from '@/features/documents/lib/checklist/definitions';
import {RESOLVERS} from '@/features/documents/lib/checklist/resolvers';
import type {ChecklistRow, RowState} from '@/features/documents/lib/checklist/types';

export function buildChecklistRows(a: any, draft: any, allStakeholders: any[]): ChecklistRow[] {
  const checkList = a.documentChecks || [];

  return MASTER_DOC_DEFINITIONS.map(def => {
    const chk = checkList.find(
      (c: any) =>
        String(c.documentCode).toUpperCase() === def.code ||
        String(c.documentName).toLowerCase() === def.name.toLowerCase(),
    );
    const files = chk?.files || [];

    const row: RowState = {
      isAvailable: files.length > 0,
      sourceType: files.length > 0 ? 'MANUAL' : 'NONE',
      sourceLabel: def.defaultSection,
      sourceDetails: '',
      canDelete: false, // system linked files cannot be deleted here
      isMandatory: def.isMandatory,
      previewUrl: files[0]?.fileUrl || (files[0]?.fileName ? `/documents/${files[0].fileName}` : ''),
    };

    RESOLVERS[def.code]?.({a, draft, files, allStakeholders, row});

    return {
      ...def,
      ...row,
      chkId: chk?.id,
      status: chk?.status || (row.isAvailable ? 'UPLOADED' : 'PENDING'),
      files,
    };
  });
}
