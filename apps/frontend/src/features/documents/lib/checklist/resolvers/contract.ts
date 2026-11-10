/** Where the CONTRACT document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveContract({a, draft, files, row}: ResolverContext) {
  const projects = draft.projects || a.projects || [];

  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = 'Upload Manual (Document Checklist)';
    row.sourceDetails = `Berkas diunggah: ${files[0].fileName}`;
    row.canDelete = true;
  } else if (projects.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'Pre-analysis · Business & Banks';
    row.sourceDetails = `Kontrak proyek terdata: ${projects
      .map((p: any) => p.projectName || p.clientName)
      .filter(Boolean)
      .join(', ')}`;
    row.canDelete = false;
  }
}
