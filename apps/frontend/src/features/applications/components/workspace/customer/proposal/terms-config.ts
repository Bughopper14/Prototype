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
  {dataField: p + 'Payment', label: 'Cara Pembayaran / Payment Method', key: 'paymentMethod'},
];

export const TERMS_GROUPS: TermsGroupConfig[] = [
  {
    group: 'termsFinancialLease',
    title: 'Sewa Pembiayaan / Financial Lease',
    headerBackground: '#e0f2fe',
    fields: [
      {
        dataField: 'flInvestment',
        label: 'Working Capital / Investment',
        key: 'investment',
        alsoWrite: ['workingCapitalInvestment'],
        readKeys: ['workingCapitalInvestment', 'investment'],
      },
      {dataField: 'flCurrency', label: 'Mata Uang / Currency', key: 'currency'},
      {dataField: 'flDeposit', label: 'Simpanan Jaminan / Security Deposit', key: 'securityDeposit'},
      ...COMMON_TAIL('fl'),
    ],
  },
  {
    group: 'termsSaleAndLeaseBack',
    title: 'Jual dan Sewa Kembali / Sale and Lease Back',
    headerBackground: '#f1f5f9',
    fields: [
      {dataField: 'slbPurpose', label: 'Working Capital / Investment', key: 'workingCapitalInvestment'},
      {dataField: 'slbCurrency', label: 'Mata Uang / Currency', key: 'currency'},
      {dataField: 'slbDeposit', label: 'Simpanan Jaminan / Security Deposit', key: 'securityDeposit'},
      ...COMMON_TAIL('slb'),
    ],
  },
  {
    group: 'termsInstallmentFinancing',
    title: 'Pembelian dg Angsuran / Installment Financing',
    headerBackground: '#f1f5f9',
    fields: [
      {dataField: 'ifPurpose', label: 'Working Capital / Investment', key: 'workingCapitalInvestment'},
      {dataField: 'ifCurrency', label: 'Mata Uang / Currency', key: 'currency'},
      {dataField: 'ifDownPayment', label: 'Uang Muka / Down Payment', key: 'downPayment'},
      ...COMMON_TAIL('if'),
    ],
  },
];
