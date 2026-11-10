/** Where the NIB document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveNib({a, draft, files, row}: ResolverContext) {
  const customerNib = String(draft.customer?.nib || a.customer?.nib || '').trim();

  const hasNibData = customerNib.length >= 10;

  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = 'Upload Manual (Document Checklist)';
    row.sourceDetails = `Berkas diunggah: ${files[0].fileName}`;
    row.canDelete = true;
  } else if (hasNibData) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'FAP Stage · Customer & PIC';
    row.sourceDetails = `NIB Terdaftar: ${customerNib} · ${draft.customer?.companyName || a.customer?.companyName || 'Perusahaan'}`;
    row.canDelete = false;
  }
}
