/**
 * FAP sections 05 (purpose & assets), 07 (references) and 08 (financing proposal) keep their form state in
 * the draft as `financingPurposeDetail`, `referenceComments` and `financingProposal`. The database stores the
 * proposal as `financingProposalJson` on the application profile, the comments on the first bank reference,
 * and the summary terms in `financing_detail` (draft.proposal).
 */
import {bankFields, blank, projectFields} from '@liugong/shared';

/** Reads a number typed the Indonesian way ("1.500.000.000", "11,5", "11.5% Flat", "36 Bulan"). */
export function parseMoney(val: any): number {
  if (typeof val === 'number') return Number.isNaN(val) ? 0 : val;
  if (!val) return 0;
  const clean = String(val)
    .trim()
    .replace(/[^\d.,-]/g, '');
  if (!clean) return 0;
  if ((clean.match(/\./g) || []).length > 1) return Number(clean.replace(/\./g, '').replace(',', '.')) || 0;
  if (clean.includes('.') && clean.includes(','))
    return Number(clean.replace(/\./g, '').replace(',', '.')) || 0;
  if ((clean.match(/,/g) || []).length > 1) return Number(clean.replace(/,/g, '')) || 0;
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length === 2 && parts[1].length === 3 && Number(parts[0]) > 0)
      return Number(clean.replace('.', '')) || 0;
  }
  return Number(clean.replace(/,/g, '.')) || 0;
}

/** Fills the section 05/07/08 form state from what the API returned. */
export function initDraftBase(a: any) {
  const base = structuredClone(a || {});
  if (!base.projects || base.projects.length === 0) base.projects = [blank(projectFields)];
  if (!base.businessRole && base.business_role) base.businessRole = base.business_role;
  if (!base.industrySegment && base.industry_segment) base.industrySegment = base.industry_segment;
  if (!base.bankReferences) base.bankReferences = [];
  if (base.bankReferences?.[0]?.comments && !base.referenceComments)
    base.referenceComments = base.bankReferences[0].comments;
  if (!base.financingProposal && base.financingProposalJson) {
    try {
      base.financingProposal =
        typeof base.financingProposalJson === 'string'
          ? JSON.parse(base.financingProposalJson)
          : base.financingProposalJson;
    } catch {
      /* stored JSON is broken: fall back to the summary terms below */
    }
  }
  if (!base.financingProposal && base.proposal) {
    const p = base.proposal;
    base.financingProposal = {
      facilityProposed: {
        financingMethod: p.financingMethod || '',
        currencyChoice: p.currency || '',
        financingValue: p.financingValue || '',
        applicationSource: p.applicationSource || '',
      },
      termsFinancialLease: {
        workingCapitalInvestment: p.facilityPurpose || '',
        currency: p.currency || '',
        securityDeposit: p.securityDeposit || '',
        interestRate: p.interestRate || '',
        tenor: p.tenorMonths || '',
        paymentMethod: p.paymentMethod || '',
      },
      notes: p.termsNotes || '',
    };
  }
  if (base.proposal?.termsNotes && !base.financingProposal?.notes) {
    if (!base.financingProposal) base.financingProposal = {};
    base.financingProposal.notes = base.proposal.termsNotes;
  }
  return base;
}

/** Bank references with the section 07 comments kept on the first row. */
export function bankReferencesWithComments(draft: any) {
  const rows = (draft.bankReferences || []).map((ref: any, idx: number) =>
    idx === 0 && draft.referenceComments !== undefined ? {...ref, comments: draft.referenceComments} : ref,
  );
  if (rows.length === 0 && draft.referenceComments)
    rows.push({...blank(bankFields), comments: draft.referenceComments});
  return rows;
}

/** The section 08 proposal folded into the summary terms stored in financing_detail. */
export function mergedProposal(draft: any) {
  const fp = draft.financingProposal || {};
  const method = fp.facilityProposed?.financingMethod || draft.proposal?.financingMethod || 'FINANCIAL_LEASE';
  const upper = String(method).toUpperCase();
  const terms = upper.includes('SALE')
    ? fp.termsSaleAndLeaseBack || {}
    : upper.includes('INSTALLMENT') || upper.includes('PEMBELIAN')
      ? fp.termsInstallmentFinancing || {}
      : fp.termsFinancialLease || {};
  const pick = (formValue: any, fallback: any) =>
    formValue !== undefined && formValue !== '' ? parseMoney(formValue) : fallback;
  return {
    ...(draft.proposal || {}),
    financingMethod: method,
    currency: fp.facilityProposed?.currencyChoice || terms.currency || draft.proposal?.currency || 'IDR',
    financingValue: pick(
      fp.facilityProposed?.financingValue,
      draft.proposal?.financingValue !== undefined ? parseMoney(draft.proposal.financingValue) : null,
    ),
    downPaymentValue: pick(terms.downPayment, parseMoney(draft.proposal?.downPaymentValue)),
    securityDeposit: pick(terms.securityDeposit, parseMoney(draft.proposal?.securityDeposit)),
    interestRate: pick(terms.interestRate, parseMoney(draft.proposal?.interestRate)),
    tenorMonths: pick(
      terms.tenor,
      draft.proposal?.tenorMonths ? parseMoney(draft.proposal.tenorMonths) : null,
    ),
    paymentMethod: terms.paymentMethod || draft.proposal?.paymentMethod || 'In Arrear',
    applicationSource:
      fp.facilityProposed?.applicationSource || draft.proposal?.applicationSource || 'DIRECT_SALES',
    facilityPurpose: terms.workingCapitalInvestment || draft.proposal?.facilityPurpose || 'INVESTMENT',
    termsNotes: fp.notes !== undefined ? fp.notes : draft.notes || draft.proposal?.termsNotes || '',
    units: draft.proposal?.units || [],
  };
}

/** Profile values of sections 05, 07 and 08 that are saved with the customer profile. */
export function proposalProfileValues(draft: any) {
  return {
    financingProposalJson: JSON.stringify(draft.financingProposal || {}),
    referenceComments: draft.referenceComments || '',
    financingPurposeDetail: draft.financingPurposeDetail || '',
    assetSummaryHeLiuGong: Number(draft.assetSummaryHeLiuGong) || 0,
    assetSummaryTruckLiuGong: Number(draft.assetSummaryTruckLiuGong) || 0,
    assetSummaryHeNonLiuGong: Number(draft.assetSummaryHeNonLiuGong) || 0,
    assetSummaryTruckNonLiuGong: Number(draft.assetSummaryTruckNonLiuGong) || 0,
  };
}

/** Rich-text from TinyMCE ends up in plain profile/bank columns: drop the wrapper of an empty editor. */
export const isEmptyHtml = (html: any) =>
  !String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, '')
    .trim();
