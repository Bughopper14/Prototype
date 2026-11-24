/** Where the CONTRACT document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveContract({files, row}: ResolverContext) {
  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = 'Manual Upload (Document Checklist)';
    row.sourceDetails = `Uploaded file: ${files[0].fileName}`;
    row.canDelete = true;
  }
}
