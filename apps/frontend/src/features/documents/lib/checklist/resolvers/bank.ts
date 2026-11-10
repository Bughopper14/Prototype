/** Where the BANK document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveBank({a, draft, files, row}: ResolverContext) {
  const banks = draft.bankReferences || a.bankReferences || [];

  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = 'Upload Manual (Document Checklist)';
    row.sourceDetails = `Berkas diunggah: ${files[0].fileName}`;
    row.canDelete = true;
  } else if (banks.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'Pre-analysis · Business & Banks';
    row.sourceDetails = `Rekening fasilitas bank tercatat: ${banks
      .map((b: any) => b.bankName || b.bankOrFinInstitution)
      .filter(Boolean)
      .join(', ')}`;
    row.canDelete = false;
  }
}
