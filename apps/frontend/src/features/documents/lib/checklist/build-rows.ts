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
  const checkList: any[] = a?.documentChecks || [];
  const byCode = new Map(definitions.map(d => [d.code, d]));

  if (checkList.length > 0) {
    return checkList.map((chk: any) => {
      const def = byCode.get(chk.documentCode);
      const files = chk.files || [];

      const row: RowState = {
        isAvailable: files.length > 0,
        sourceType: files.length > 0 ? 'MANUAL' : 'NONE',
        sourceLabel: def?.defaultSection || chk.stageName || chk.stageCode || '',
        sourceDetails: '',
        canDelete: false, // system linked files cannot be deleted here
        isMandatory: chk.isMandatory != null ? !!chk.isMandatory : !!def?.isMandatory,
        previewUrl: files[0]?.fileUrl || (files[0]?.fileName ? `/documents/${files[0].fileName}` : ''),
      };

      RESOLVERS[chk.documentCode]?.({a, draft, files, allStakeholders, row});
      // a document can have several files (one KTP per stakeholder, several deeds): say how many instead of naming the first one
      if (files.length > 1 && row.sourceType === 'MANUAL') {
        row.sourceDetails = `${files.length} berkas diunggah`;
      }

      return {
        code: chk.documentCode,
        name: chk.documentName || def?.name || chk.documentCode,
        title: chk.documentName || def?.title || def?.name || chk.documentCode,
        description: def?.description || 'Added for this application',
        defaultSection: def?.defaultSection || chk.stageCode || '',
        stage: chk.stageCode || def?.stage || '',
        stageName: chk.stageName || def?.stageName || chk.stageCode || '',
        department: (chk.assignedRole || def?.department || '') as MasterDocDef['department'],
        ...row,
        chkId: chk.id,
        check: chk,
        status: chk.status || (row.isAvailable ? 'UPLOADED' : 'PENDING'),
        files,
      };
    });
  }

  // Fallback for unsaved applications before checklist is seeded
  return definitions.map(def => {
    const files: any[] = [];
    const row: RowState = {
      isAvailable: false,
      sourceType: 'NONE',
      sourceLabel: def.defaultSection,
      sourceDetails: '',
      canDelete: false,
      isMandatory: def.isMandatory,
      previewUrl: '',
    };

    RESOLVERS[def.code]?.({a, draft, files, allStakeholders, row});

    return {
      ...def,
      ...row,
      status: row.isAvailable ? 'UPLOADED' : 'PENDING',
      files,
    };
  });
}
