/**
 * The printed FAP form has three fixed Terms & Conditions columns. Each column is for one financing method
 * (crm_master_financing_methods.code); the terms are stored in crm_fap_proposal_terms per method.
 */
export const FAP_TERMS_COLUMNS = {
  termsFinancialLease: 'FINANCIAL_LEASE',
  termsSaleAndLeaseBack: 'SALE_AND_LEASE_BACK',
  termsInstallmentFinancing: 'INSTALLMENT_FINANCING',
} as const;
export type FapTermsColumn = keyof typeof FAP_TERMS_COLUMNS;
