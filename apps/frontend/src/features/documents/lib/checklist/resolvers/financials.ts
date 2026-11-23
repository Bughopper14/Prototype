/** Where the FINANCIALS document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveFinancials({a, draft, files, row}: ResolverContext) {
  const statements = draft.financialStatements || a.financialStatements || [];

  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = 'Manual Upload (Document Checklist)';
    row.sourceDetails = `Uploaded file: ${files[0].fileName}`;
    row.canDelete = true;
  } else if (statements.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'Pre-analysis · Financial Statements';
    row.sourceDetails = `Financial statements on file for fiscal year(s): ${statements.map((s: any) => s.fiscalYear || s.year).join(', ')}`;
    row.canDelete = false;
  }
}
