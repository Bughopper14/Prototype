/** Where the QUOTATION document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveQuotation({a, draft, files, row}: ResolverContext) {
  const units = draft.proposal?.units || a.proposal?.units || [];

  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = 'Upload Manual (Document Checklist)';
    row.sourceDetails = `Berkas diunggah: ${files[0].fileName}`;
    row.canDelete = true;
  } else if (units.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'Pre-analysis · Financing & Units';
    row.sourceDetails = `${units.length} unit alat diajukan: ${units.map((u: any) => u.modelName || u.assetName || 'Unit').join(', ')}`;
    row.canDelete = false;
  }
}
