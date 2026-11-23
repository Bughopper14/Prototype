/** Where the NIB document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveNib({a, draft, files, row}: ResolverContext) {
  const customerNib = String(draft.customer?.nib || a.customer?.nib || '').trim();

  const hasNibData = customerNib.length >= 10;

  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = 'Manual Upload (Document Checklist)';
    row.sourceDetails = `Uploaded file: ${files[0].fileName}`;
    row.canDelete = true;
  } else if (hasNibData) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'FAP Stage · Customer & PIC';
    row.sourceDetails = `Registered NIB: ${customerNib} · ${draft.customer?.companyName || a.customer?.companyName || 'Company'}`;
    row.canDelete = false;
  }
}
