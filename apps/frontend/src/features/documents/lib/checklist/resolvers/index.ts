/** One resolver per document code; each fills in the source and availability of that document. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';
import {resolveFap} from '@/features/documents/lib/checklist/resolvers/fap';
import {resolveNib} from '@/features/documents/lib/checklist/resolvers/nib';
import {resolveKtp} from '@/features/documents/lib/checklist/resolvers/ktp';
import {resolveEkitas} from '@/features/documents/lib/checklist/resolvers/ekitas';
import {resolveDeed} from '@/features/documents/lib/checklist/resolvers/deed';
import {resolveNpwp} from '@/features/documents/lib/checklist/resolvers/npwp';
import {resolvePreanalysis} from '@/features/documents/lib/checklist/resolvers/preanalysis';
import {resolveFinancials} from '@/features/documents/lib/checklist/resolvers/financials';
import {resolveBank} from '@/features/documents/lib/checklist/resolvers/bank';
import {resolveQuotation} from '@/features/documents/lib/checklist/resolvers/quotation';
import {resolveContract} from '@/features/documents/lib/checklist/resolvers/contract';
import {resolveLegalOpinion} from '@/features/documents/lib/checklist/resolvers/legal-opinion';
import {resolveIclf} from '@/features/documents/lib/checklist/resolvers/iclf';

export const RESOLVERS: Record<string, (ctx: ResolverContext) => void> = {
  FAP: resolveFap,
  NIB: resolveNib,
  KTP: resolveKtp,
  EKITAS: resolveEkitas,
  DEED: resolveDeed,
  NPWP: resolveNpwp,
  PREANALYSIS: resolvePreanalysis,
  FINANCIALS: resolveFinancials,
  BANK: resolveBank,
  QUOTATION: resolveQuotation,
  CONTRACT: resolveContract,
  LEGAL_OPINION: resolveLegalOpinion,
  ICLF: resolveIclf,
};
