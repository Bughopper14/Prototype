/** Where the PREANALYSIS document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolvePreanalysis({a, draft, files, row}: ResolverContext) {
  const isPreStage = a.stage === 'Pre-analysis' || draft.stage === 'Pre-analysis';

  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'Pre-analysis Stage · Comparison';
    row.sourceDetails = `Berkas Pre-analysis: ${files[0].fileName}`;
    row.canDelete = false;
  } else if (isPreStage) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'Pre-analysis Stage';
    row.sourceDetails = 'Formulir Evaluasi Pre-analysis CA telah diisi & tersimpan';
    row.canDelete = false;
  }
}
