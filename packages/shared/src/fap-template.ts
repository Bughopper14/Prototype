/**
 * The printed FAP form has three fixed Terms & Conditions columns. Each column is for one financing method
 * (crm_master_financing_methods.code); the terms are stored in crm_fap_proposal_terms per method.
 */
export const FAP_TERMS_COLUMNS = {
  termsFinancialLease: 'FINANCIAL-LEASE',
  termsSaleAndLeaseBack: 'SALE-AND-LEASE-BACK',
  termsInstallmentFinancing: 'INSTALLMENT-FINANCING',
} as const;
export type FapTermsColumn = keyof typeof FAP_TERMS_COLUMNS;

/** Resolves a financing method code or label to its FAP terms column group key. */
export function resolveFinancingMethodGroup(val?: string | null): FapTermsColumn | undefined {
  const upper = String(val || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (!upper) return undefined;
  if (upper === 'FINANCIAL_LEASE' || upper.includes('FINANCIAL_LEASE') || upper.includes('SEWA_PEMBIAYAAN'))
    return 'termsFinancialLease';
  if (upper === 'SALE_AND_LEASE_BACK' || upper === 'SLB' || upper.includes('SALE'))
    return 'termsSaleAndLeaseBack';
  if (upper === 'INSTALLMENT_FINANCING' || upper.includes('INSTALLMENT') || upper.includes('PEMBELIAN'))
    return 'termsInstallmentFinancing';
  return undefined;
}
