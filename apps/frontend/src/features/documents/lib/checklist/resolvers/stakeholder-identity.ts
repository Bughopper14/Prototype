/** The identity documents of the stakeholders: KTP / passport (primary identity) and personal NPWP / E-KITAS (second identity). */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

function resolveIdentity({files, allStakeholders, row}: ResolverContext, label: string, urlFields: string[]) {
  const urlOf = (s: any) => urlFields.map(f => s[f]).find(Boolean);
  const holders = allStakeholders.filter(urlOf);
  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = `Stakeholder Identity (${label})`;
    row.sourceDetails = files.length === 1 ? `Uploaded file: ${files[0].fileName}` : `${files.length} uploaded files (${files[0].fileName})`;
    row.canDelete = true;
    row.previewUrl = files[0].fileUrl || (holders[0] ? urlOf(holders[0]) : '');
  } else if (holders.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'SYSTEM_LINKED';
    row.sourceLabel = 'Legal · Stakeholders';
    const names = holders.map(s => s.name || s.idNumber).filter(Boolean);
    row.sourceDetails = `${label} of ${holders.length} stakeholder(s): ${names.slice(0, 3).join(', ')}${names.length > 3 ? '...' : ''}`;
    row.canDelete = false;
    row.previewUrl = urlOf(holders[0]);
  }
}

export const resolveKtpPassport = (ctx: ResolverContext) => resolveIdentity(ctx, 'KTP / Paspor', ['ktpUrl', 'passportUrl']);
export const resolveNpwpEkitas = (ctx: ResolverContext) => resolveIdentity(ctx, 'NPWP Pribadi / E-KITAS', ['npwpUrl', 'kitasUrl']);
