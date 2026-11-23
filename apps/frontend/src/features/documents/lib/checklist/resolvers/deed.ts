/** Where the DEED document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveDeed({a, draft, files, row}: ResolverContext) {
  const deeds = draft.legal?.deeds || a.legal?.deeds || [];

  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = 'Manual Upload (Document Checklist)';
    row.sourceDetails = `Uploaded file: ${files[0].fileName}`;
    row.canDelete = true;
  } else if (deeds.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'Legal · Company Deeds';
    const deedSummaries = deeds.map(
      (d: any) =>
        `${d.type === 'establishment' ? 'Establishment Deed' : 'Amendment Deed'} No. ${d.deedNumber || '-'}`,
    );
    row.sourceDetails = `${deeds.length} deed(s) recorded: ${deedSummaries.join(', ')}`;
    row.canDelete = false;
  }
}
