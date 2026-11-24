/** Where the PREANALYSIS document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';
import {STAGE} from '@/shared/master-data';

export function resolvePreanalysis({files, row}: ResolverContext) {
  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'Pre-analysis Stage · Comparison';
    row.sourceDetails = `Pre-analysis file: ${files[0].fileName}`;
    row.canDelete = false;
  }
}
