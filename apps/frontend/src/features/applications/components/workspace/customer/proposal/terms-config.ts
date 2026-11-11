/** The three Terms & Conditions columns of the financing proposal (all free text). */
export type TermsGroupKey = 'termsFinancialLease' | 'termsSaleAndLeaseBack' | 'termsInstallmentFinancing';

export interface TermsFieldConfig {
  /** Used as the data-field and the id suffix, so the live document can find the field. */
  dataField: string;
  label: string;
  /** Key under the group that is written. */
  key: string;
  /** Extra keys written with the same value (the first field of Financial Lease keeps a legacy key). */
  alsoWrite?: string[];
  /** Keys tried in order when reading. Defaults to [key]. */
  readKeys?: string[];
  /** When provided, renders as a select dropdown instead of free text. */
  options?: ReadonlyArray<{value: string; label: string}>;
  /** Normalizes stored values (e.g. legacy uppercase/underscore values) to match `options`. */
  normalizeValue?: (raw: string) => string;
}

export const TERMS_PURPOSE_OPTIONS: ReadonlyArray<{value: string; label: string}> = [
  {value: 'Investment', label: 'Investment'},
  {value: 'Working Capital', label: 'Working Capital'},
];

/** Normalizes stored Working Capital / Investment values to dropdown option values. */
export function normalizeTermsPurpose(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  const upper = s.toUpperCase();
  if (upper.includes('WORKING') || upper.includes('MODAL')) return 'Working Capital';
  if (upper.includes('INVEST')) return 'Investment';
  return s;
}

export interface TermsGroupConfig {
  group: TermsGroupKey;
  title: string;
  /** Background of the column heading. */
  headerBackground: string;
  fields: TermsFieldConfig[];
}

export const FINANCING_METHODS: ReadonlyArray<{label: string; group: TermsGroupKey}> = [
  {label: 'Financial Lease', group: 'termsFinancialLease'},
  {label: 'Sale and Lease Back', group: 'termsSaleAndLeaseBack'},
  {label: 'Installment Financing', group: 'termsInstallmentFinancing'},
];

export function resolveFinancingMethod(val?: string | null) {
  const upper = String(val || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (!upper) return undefined;
  if (upper === 'FINANCIAL_LEASE' || upper.includes('FINANCIAL_LEASE') || upper.includes('SEWA_PEMBIAYAAN'))
    return FINANCING_METHODS[0];
  if (upper === 'SALE_AND_LEASE_BACK' || upper === 'SLB' || upper.includes('SALE'))
    return FINANCING_METHODS[1];
  if (upper === 'INSTALLMENT_FINANCING' || upper.includes('INSTALLMENT') || upper.includes('PEMBELIAN'))
    return FINANCING_METHODS[2];
  return undefined;
}

const COMMON_TAIL = (p: string): TermsFieldConfig[] => [
  {dataField: p + 'Rate', label: 'Bunga / Interest Rate', key: 'interestRate'},
  {dataField: p + 'Tenor', label: 'Jk. Waktu / Tenor', key: 'tenor'},
  {dataField: p + 'Payment', label: 'Cara Pembayaran / Payment Method', key: 'paymentMethod'},
];

const purposeField = (
  dataField: string,
  extra?: Partial<TermsFieldConfig>,
): TermsFieldConfig => ({
  dataField,
  label: 'Working Capital / Investment',
  key: 'workingCapitalInvestment',
  options: TERMS_PURPOSE_OPTIONS,
  normalizeValue: normalizeTermsPurpose,
  ...extra,
});

export const TERMS_GROUPS: TermsGroupConfig[] = [
  {
    group: 'termsFinancialLease',
    title: 'Sewa Pembiayaan / Financial Lease',
    headerBackground: '#e0f2fe',
    fields: [
      purposeField('flInvestment', {
        key: 'investment',
        alsoWrite: ['workingCapitalInvestment'],
        readKeys: ['workingCapitalInvestment', 'investment'],
      }),
      {dataField: 'flCurrency', label: 'Mata Uang / Currency', key: 'currency'},
      {dataField: 'flDeposit', label: 'Simpanan Jaminan / Security Deposit', key: 'securityDeposit'},
      ...COMMON_TAIL('fl'),
    ],
  },
  {
    group: 'termsSaleAndLeaseBack',
    title: 'Jual dan Sewa Kembali / Sale and Lease Back',
    headerBackground: '#e0f2fe',
    fields: [
      purposeField('slbPurpose'),
      {dataField: 'slbCurrency', label: 'Mata Uang / Currency', key: 'currency'},
      {dataField: 'slbDeposit', label: 'Simpanan Jaminan / Security Deposit', key: 'securityDeposit'},
      ...COMMON_TAIL('slb'),
    ],
  },
  {
    group: 'termsInstallmentFinancing',
    title: 'Pembelian dg Angsuran / Installment Financing',
    headerBackground: '#e0f2fe',
    fields: [
      purposeField('ifPurpose'),
      {dataField: 'ifCurrency', label: 'Mata Uang / Currency', key: 'currency'},
      {dataField: 'ifDownPayment', label: 'Uang Muka / Down Payment', key: 'downPayment'},
      ...COMMON_TAIL('if'),
    ],
  },
];
