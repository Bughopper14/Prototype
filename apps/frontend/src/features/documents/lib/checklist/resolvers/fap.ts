/** Where the FAP document comes from and whether it is available. */
import {storedFileUrl} from '@/features/documents/lib/checklist/file-url';
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveFap({a, files, row}: ResolverContext) {
  const fapComparison = a.submitLock?.ocrComparison;

  // submitLock.isLocked is 0 once the signed FAP form has a file (crm_fap_application_profiles.is_fap_doc_uploaded)
  const hasFapUpload = files.length > 0 || Number(a.submitLock?.isLocked) === 0;

  if (hasFapUpload || fapComparison) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'FAP Stage · Document Comparison';
    row.sourceDetails = files[0]?.fileName
      ? `File: ${files[0].fileName} (Compared with system template)`
      : 'FAP form compared and locked in system';
    row.canDelete = false; // Linked from FAP comparison -> Cannot be deleted here
    if (files[0]) {
      row.previewUrl = storedFileUrl(files[0]);
    }
  }
}
