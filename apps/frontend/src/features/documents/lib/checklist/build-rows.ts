/**
 * Works out, for every document of the application's checklist, where it comes from and whether it is there. The
 * checklist is the application's own (its workflow's default documents plus what was added for it); a document that is
 * not in Master Data's list (a free-name one added for this application) gets a definition from its checklist row. An
 * application that is not saved yet has no checklist, so it shows every active master document.
 */
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
  const byCode = new Map(definitions.map(d => [d.code, d]));
  const own: MasterDocDef[] = checkList.length
    ? checkList.map(
        (c: any): MasterDocDef =>
          byCode.get(c.documentCode) ?? {
            code: c.documentCode,
            name: c.documentName,
            title: c.documentName,
            department: (c.assignedRole || '') as MasterDocDef['department'],
            isMandatory: !!c.isMandatory,
            defaultSection: c.stageCode || '',
            stage: c.stageCode || '',
            stageName: c.stageName || '',
            description: 'Added for this application',
          },
      )
    : definitions;

  return own.map(def => {
    const chk = checkList.find((c: any) => c.documentCode === def.code);
    const files = chk?.files || [];

    const row: RowState = {
      isAvailable: files.length > 0,
      sourceType: files.length > 0 ? 'MANUAL' : 'NONE',
      sourceLabel: def.defaultSection,
      sourceDetails: '',
      canDelete: false, // system linked files cannot be deleted here
      isMandatory: chk ? !!chk.isMandatory : def.isMandatory,
      previewUrl: files[0]?.fileUrl || (files[0]?.fileName ? `/documents/${files[0].fileName}` : ''),
    };

    RESOLVERS[def.code]?.({a, draft, files, allStakeholders, row});

    return {
      ...def,
      // the stage comes from the application's own checklist row (the workflow), not from the master definition
      stage: chk?.stageCode || def.stage,
      stageName: chk?.stageName || def.stageName,
      // the department too: the master definition has none, the workflow gives it (the stage's, or the one chosen for an added document)
      department: chk?.assignedRole || def.department,
      ...row,
      chkId: chk?.id,
      check: chk,
      status: chk?.status || (row.isAvailable ? 'UPLOADED' : 'PENDING'),
      files,
    };
  });
}
