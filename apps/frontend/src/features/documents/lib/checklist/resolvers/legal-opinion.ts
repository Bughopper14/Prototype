/** Where the LEGAL_OPINION document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveLegalOpinion({files, row}: ResolverContext) {
  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = 'Upload Manual (Document Checklist)';
    row.sourceDetails = `Berkas diunggah: ${files[0].fileName}`;
    row.canDelete = true;
  }
}
