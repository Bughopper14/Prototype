/** Where the KTP document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveKtp({files, allStakeholders, row}: ResolverContext) {
  const ktpStakeholders = allStakeholders.filter(
    s => s.ktpUrl || s.fileUrl || s.file_name || s.document_path || s.ktpFileName,
  );

  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = 'Stakeholder Identity (KTP)';
    row.sourceDetails = files.length === 1 ? `Uploaded file: ${files[0].fileName}` : `${files.length} uploaded files (${files[0].fileName})`;
    row.canDelete = true;
    row.previewUrl = files[0].fileUrl || (files[0].fileName ? `/documents/${files[0].fileName}` : '');
  } else if (ktpStakeholders.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'Legal · Stakeholders';
    const names = ktpStakeholders.map(s => s.name || s.idNumber).filter(Boolean);
    row.sourceDetails = `Verified KTP for ${ktpStakeholders.length} stakeholder(s): ${names.slice(0, 3).join(', ')}${names.length > 3 ? '...' : ''}`;
    row.canDelete = false;
    // Point to first stakeholder KTP photo if available
    row.previewUrl = ktpStakeholders[0]?.ktpUrl || ktpStakeholders[0]?.fileUrl || '';
  }
}
