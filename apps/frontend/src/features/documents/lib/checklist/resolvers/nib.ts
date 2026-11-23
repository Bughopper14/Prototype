/** Where the NIB document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveNib({files, row}: ResolverContext) {
  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = 'NIB Document';
    row.sourceDetails = `Uploaded file: ${files[0].fileName}`;
    row.canDelete = true;
  }
}

