/** Where the NPWP document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveNpwp({a, draft, files, row}: ResolverContext) {
  const customerNpwp = String(draft.customer?.npwp || a.customer?.npwp || '').trim();

  const hasNpwpData = customerNpwp.length >= 10;

  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = 'Upload Manual (Document Checklist)';
    row.sourceDetails = `Berkas diunggah: ${files[0].fileName}`;
    row.canDelete = true;
  } else if (hasNpwpData) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'FAP Stage · Customer & PIC';
    row.sourceDetails = `NPWP Perusahaan Terdaftar: ${customerNpwp}`;
    row.canDelete = false;
  }
}
