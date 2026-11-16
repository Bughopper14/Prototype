/** Works out, for every required document, where it comes from and whether it is there. */
import type {MasterDocDef} from '@/features/documents/lib/checklist/definitions';
import {RESOLVERS} from '@/features/documents/lib/checklist/resolvers';
import type {ChecklistRow, RowState} from '@/features/documents/lib/checklist/types';

export function buildChecklistRows(
  definitions: MasterDocDef[],
  a: any,
  draft: any,
  allStakeholders: any[],
): ChecklistRow[] {
  const checkList = a.documentChecks || [];

  return definitions.map(def => {
    const chk = checkList.find((c: any) => c.documentCode === def.code);
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
      check: chk,
      status: chk?.status || (row.isAvailable ? 'UPLOADED' : 'PENDING'),
      files,
    };
  });
}
