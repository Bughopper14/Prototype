/** Where the FAP document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveFap({a, files, row}: ResolverContext) {
  const fapComparison = a.submitLock?.ocrComparison;

  // submitLock.isLocked is 0 once the signed FAP form has a file (crm_applications.is_fap_doc_uploaded)
  const hasFapUpload = files.length > 0 || Number(a.submitLock?.isLocked) === 0;

  if (hasFapUpload || fapComparison) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'FAP Stage · Document Comparison';
    row.sourceDetails = files[0]?.fileName
      ? `Berkas: ${files[0].fileName} (Dikomparasi dengan template sistem)`
      : 'Formulir FAP terkomparasi dan terkunci di sistem';
    row.canDelete = false; // Terhubung dari FAP comparison -> Tidak bisa dihapus di sini
    if (files[0]) {
      row.previewUrl = `/documents/${files[0].fileName}`;
    }
  }
}
