/** Where the ICLF document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveIclf({files, row}: ResolverContext) {
  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'Credit Committee Stage';
    row.sourceDetails = `Lembar persetujuan ICLF: ${files[0].fileName}`;
    row.canDelete = false;
  }
}
