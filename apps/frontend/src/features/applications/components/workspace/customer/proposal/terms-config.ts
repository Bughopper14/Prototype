/** The three Terms & Conditions columns of the financing proposal (all free text). */
export type TermsGroupKey =
  | 'termsFinancialLease'
  | 'termsSaleAndLeaseBack'
  | 'termsInstallmentFinancing'
  | 'termsUnassigned';

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
  /** The master-data list this field is chosen from ('paymentMethod', 'currency'): the saved value is the master code, so it can only be picked, never typed. */
  master?: 'paymentMethod' | 'currency';
  /** Normalizes stored values (e.g. legacy uppercase/underscore values) to match `options`. */
  normalizeValue?: (raw: string) => string;
}

export const TERMS_PURPOSE_OPTIONS: ReadonlyArray<{value: string; label: string}> = [
  {value: '', label: '-- Pilih / Kosong --'},
  {value: 'INVESTMENT', label: 'Investment'},
  {value: 'WORKING-CAPITAL', label: 'Working Capital'},
];

/** Options for Cara Pembayaran / Payment Timing matching master_payment_timings. */
export const PAYMENT_METHOD_OPTIONS: ReadonlyArray<{value: string; label: string}> = [
  {value: '', label: '-- Pilih / Kosong --'},
  {value: 'IN-ARREAR', label: 'In Arrear'},
  {value: 'IN-ADVANCE', label: 'In Advance'},
];

/** Normalizes stored Cara Pembayaran / Payment Method values to master code options or empty. */
export function normalizePaymentMethod(raw?: string | null): string {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return '';
  if (s.includes('ADVANCE')) return 'IN-ADVANCE';
  if (s.includes('ARREAR')) return 'IN-ARREAR';
  return '';
}

/** Normalizes stored Working Capital / Investment values to dropdown option values. */
export function normalizeTermsPurpose(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  const upper = s.toUpperCase();
  if (upper.includes('WORKING') || upper.includes('MODAL')) return 'WORKING-CAPITAL';
  if (upper.includes('INVEST')) return 'INVESTMENT';
  return s;
}

export interface TermsGroupConfig {
  group: TermsGroupKey;
  title: string;
  /** Background of the column heading. */
  headerBackground: string;
  fields: TermsFieldConfig[];
}

const COMMON_TAIL = (p: string): TermsFieldConfig[] => [
  {dataField: p + 'Rate', label: 'Bunga / Interest Rate', key: 'interestRate'},
  {dataField: p + 'Tenor', label: 'Jk. Waktu / Tenor', key: 'tenor'},
  {
    dataField: p + 'Payment',
    label: 'Cara Pembayaran / Payment Method',
    key: 'paymentMethod',
    options: PAYMENT_METHOD_OPTIONS,
    normalizeValue: normalizePaymentMethod,
  },
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
      {dataField: 'flCurrency', label: 'Mata Uang / Currency', key: 'currency', master: 'currency'},
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
      {dataField: 'slbCurrency', label: 'Mata Uang / Currency', key: 'currency', master: 'currency'},
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
      {dataField: 'ifCurrency', label: 'Mata Uang / Currency', key: 'currency', master: 'currency'},
      {dataField: 'ifDownPayment', label: 'Uang Muka / Down Payment', key: 'downPayment'},
      ...COMMON_TAIL('if'),
    ],
  },
];
