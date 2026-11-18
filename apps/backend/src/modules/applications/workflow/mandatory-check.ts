import {customerFields, picFields, profileFields} from '@liugong/shared';

/**
 * Mandatory-field check for every section of the FAP form, driven by the workflow's rules
 * (crm_workflow_stage_fields). Pure functions over the application detail.
 *
 * Each section knows where its data lives in the detail (a single object, or a list of items) and how a catalog
 * field key maps to a value. A key that no section can read is "not enforceable"; the Workflow setup page shows it
 * disabled instead of pretending to check it.
 */
export type FieldRule = {stageCode: string; section: string; fieldKey: string; fieldLabel: string};
export type Gap = {target: 'FAP_FORM' | 'LEGAL' | 'DOCUMENTS'; label: string; detail?: string};

type Entry = {item: string | null; value: unknown};
type Section = {
  /** Where the screen should send the user. */
  target: Gap['target'];
  /** Does this section know how to read the key? */
  has: (key: string) => boolean;
  /** One entry per item (a single entry for single-object sections); no entries when the list is empty. */
  read: (detail: any, key: string) => Entry[];
  /** Keys whose "empty" means false rather than blank. */
  booleanKeys?: Set<string>;
};

const ownKeys = new Set([...customerFields, ...profileFields, ...picFields].map(f => f.key).concat('customerCategory'));
const get = (obj: any, path: string) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const alias = (map: Record<string, string>) => (key: string) => map[key] ?? key;

/** Single-object sections on the company / profile / contact record. */
const own = (contact = false): Section => ({
  target: 'FAP_FORM',
  has: key => ownKeys.has(key),
  read: (d, key) => {
    const sources = contact ? [d.pic || {}] : [d.customer || {}, d];
    return [{item: null, value: sources.map((s: any) => s[key]).find(v => v !== undefined && v !== null && String(v).trim() !== '')}];
  },
});

/** A list read from the detail: every item is checked. */
const list = (
  items: (d: any) => any[],
  keys: Set<string> | ((k: string) => boolean),
  name: (item: any, i: number) => string,
  rename: (k: string) => string = k => k,
  target: Gap['target'] = 'FAP_FORM',
): Section => ({
  target,
  has: k => (typeof keys === 'function' ? keys(k) : keys.has(k)),
  read: (d, key) => items(d).map((it, i) => ({item: name(it, i), value: get(it, rename(key))})),
});

const BANK_KEYS = new Set([
  'bankOrFinInstitution', 'currency', 'creditFacility', 'monthlyInstallment', 'yearStarted', 'interestRate',
  'paymentRecord', 'facilityStatus', 'referenceComments',
]);
const STATEMENT_KEYS = new Set([
  'financialAudited', 'fiscalYear', 'currentAssets', 'nonCurrentAssets', 'totalAssets', 'currentLiabilities',
  'nonCurrentLiabilities', 'totalLiabilities', 'equity', 'totalLiabAndEquity', 'revenue', 'grossMargin',
  'operatingMargin', 'tax', 'netIncome',
]);
const DEED_ALIAS: Record<string, string> = {decreeNumber: 'ministerialDecreeNumber', decreeDate: 'ministerialDecreeDate'};
const DEED_KEYS = new Set([
  'type', 'deedNumber', 'deedDate', 'notaryName', 'ministerialDecreeNumber', 'ministerialDecreeDate', 'remarks',
  'remarkCategoryIds', ...Object.keys(DEED_ALIAS),
]);
const STAKEHOLDER_ALIAS: Record<string, string> = {
  shareholderName: 'name',
  shareholderPosition: 'positions',
  shareAmount: 'depositedCapital',
  taxNumber: 'idNumberSecondary',
  nationalityType: 'citizenship',
};
const STAKEHOLDER_KEYS = new Set([
  'representativeType', 'positions', 'designation', 'stakeholderType', 'signatory', 'idType', 'idNumber',
  'idNumberSecondary', 'title', 'firstName', 'middleName', 'lastName', 'dateOfBirth', 'ageYears', 'ageMonths',
  'maritalStatus', 'occupation', 'email', 'mobilePhone', 'gender', 'sharePercentage', 'depositedCapital',
  'primaryCapital', 'citizenship', 'country', 'province', 'cityRegency', 'district', 'village', 'rt', 'rw', 'address',
  'postalCode', 'name', ...Object.keys(STAKEHOLDER_ALIAS),
]);
const UNIT_KEYS = new Set(['unitCategory', 'brand', 'unitType', 'modelName', 'assetName', 'classTon', 'quantity', 'years', 'specifications']);
const PROJECT_KEYS = new Set(['projectOwner', 'projectLocation', 'projectRole', 'contractStatus']);

const stakeholdersOf = (d: any): any[] =>
  (d.legal?.deeds || []).flatMap((deed: any) => (deed.stakeholders || []).map((s: any) => ({...s, __deed: deed.deedNumber})));

/** Financing proposal: facility, the three terms columns, realization plan, notes and document requirements. */
const TERMS: Record<string, [string, Record<string, string>]> = {
  fl: ['termsFinancialLease', {Investment: 'workingCapitalInvestment', Currency: 'currency', Deposit: 'securityDeposit', Rate: 'interestRate', Tenor: 'tenor', Payment: 'paymentMethod'}],
  slb: ['termsSaleAndLeaseBack', {Purpose: 'workingCapitalInvestment', Currency: 'currency', Deposit: 'securityDeposit', Rate: 'interestRate', Tenor: 'tenor', Payment: 'paymentMethod'}],
  if: ['termsInstallmentFinancing', {Purpose: 'workingCapitalInvestment', Currency: 'currency', DownPayment: 'downPayment', Rate: 'interestRate', Tenor: 'tenor', Payment: 'paymentMethod'}],
};
const FACILITY: Record<string, string> = {
  financingMethod: 'facilityProposed.financingMethod',
  currencyChoice: 'facilityProposed.currencyChoice',
  financingValueProp: 'facilityProposed.financingValue',
  applicationSource: 'facilityProposed.applicationSource',
  propAssetLgHe: 'realizationPlan.lgHe',
  propAssetLgTruck: 'realizationPlan.lgTruck',
  propAssetNlgHe: 'realizationPlan.nlgHe',
  propAssetNlgTruck: 'realizationPlan.nlgTruck',
  proposalNotes: 'notes',
};
const DOC_REQUIREMENTS = new Set([
  'COMPANY-PROFILE', 'LEGALITY', 'DEED-ESTABLISHMENT', 'DECREE-MINISTRY-OF-LAW', 'COPY-ID-BOD-SHAREHOLDER',
  'AUDITED-FINANCIAL-STATEMENTS', 'BANK-STATEMENTS', 'BANK-FINANCING-FACILITY', 'PRODUCTION-REPORT',
  'LIST-OF-FIXED-ASSETS', 'PROJECT-CONTRACTS',
]);
/** The terms column and field a catalog key stands for, or null. */
function termsPath(key: string): string | null {
  for (const [prefix, [column, fields]] of Object.entries(TERMS)) {
    if (!key.startsWith(prefix)) continue;
    const field = fields[key.slice(prefix.length)];
    if (field) return `${column}.${field}`;
  }
  return null;
}
const proposalPath = (key: string) => FACILITY[key] ?? termsPath(key) ?? (DOC_REQUIREMENTS.has(key) ? `documentRequirements.${key}` : null);

const PROPOSAL: Section = {
  target: 'FAP_FORM',
  has: key => proposalPath(key) !== null,
  read: (d, key) => {
    const path = proposalPath(key)!;
    const fp = d.financingProposal || {};
    // A terms column only exists for a financing method the customer asked for: no column, nothing to check.
    const column = path.split('.')[0];
    if (path.startsWith('terms') && !fp[column]) return [];
    return [{item: null, value: DOC_REQUIREMENTS.has(key) ? !!get(fp, path) : get(fp, path)}];
  },
  booleanKeys: DOC_REQUIREMENTS,
};

const SECTIONS: Record<string, Section> = {
  'Debtor Identity & Classification': own(),
  'Registration Office & Company Domicile': own(),
  'Business Profile & Deed Legality': own(),
  'Primary Contact / Person in Charge (PIC)': own(true),
  'Purpose of Financing & Fixed Assets': {
    ...own(),
    has: key => ownKeys.has(key) || key === 'financingPurposeDetail',
  },
  'Industry Segmentation & Active Projects': list(d => d.projects || [], PROJECT_KEYS, (_, i) => `proyek ${i + 1}`),
  'Bank Facilities & References': list(
    d => d.bankReferences || [],
    BANK_KEYS,
    (_, i) => `bank ${i + 1}`,
    alias({referenceComments: 'comments'}),
  ),
  'Financing Proposal': PROPOSAL,
  'Equipment Units': list(d => d.proposal?.units || [], UNIT_KEYS, (_, i) => `unit ${i + 1}`),
  'Financial Statements': {
    ...list(d => d.financialStatements || [], STATEMENT_KEYS, (it, i) => `laporan ${it.fiscalYear ?? i + 1}`, alias({financialAudited: 'isAudited'})),
    booleanKeys: new Set(['financialAudited']),
  },
  'Legal Deeds & Amendments': list(
    d => d.legal?.deeds || [],
    DEED_KEYS,
    (it, i) => `akta ${it.deedNumber || i + 1}`,
    alias(DEED_ALIAS),
    'LEGAL',
  ),
  'Shareholders & Management': {
    ...list(stakeholdersOf, STAKEHOLDER_KEYS, (it, i) => `${it.name || `pemegang ${i + 1}`} (akta ${it.__deed || '-'})`, alias(STAKEHOLDER_ALIAS), 'LEGAL'),
    // "Minimum items" of this section is per deed: every deed needs that many stakeholders.
  },
};
// The section's own financingPurposeDetail field lives on the detail.
SECTIONS['Purpose of Financing & Fixed Assets'].read = (d, key) => [
  {item: null, value: key === 'financingPurposeDetail' ? d.financingPurposeDetail : [d.customer || {}, d].map((s: any) => s[key]).find(v => v !== undefined && v !== null && String(v).trim() !== '')},
];

/** Can the backend check this catalog field? (Workflow setup disables the checkbox when not.) */
export function isEnforceable(section: string, fieldKey: string): boolean {
  return !!SECTIONS[section]?.has(fieldKey);
}

const isEmpty = (v: unknown, boolean: boolean) =>
  boolean ? !v : v === undefined || v === null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');

/**
 * What is missing for the mandatory field rules of a workflow. `detail` is the application detail
 * (customer, profile, pic, projects, bankReferences, financingProposal, proposal.units, financialStatements, legal).
 */
export function mandatoryGaps(detail: any, rules: FieldRule[], stageName: (code: string) => string | undefined): Gap[] {
  const gaps: Gap[] = [];
  for (const r of rules) {
    const section = SECTIONS[r.section];
    if (!section || !section.has(r.fieldKey)) continue;
    const entries = section.read(detail, r.fieldKey);
    const boolean = section.booleanKeys?.has(r.fieldKey) ?? false;
    const missing = entries.filter(e => isEmpty(e.value, boolean));
    if (!missing.length) continue;
    const items = missing.map(e => e.item).filter(Boolean);
    gaps.push({
      target: section.target,
      label: r.fieldLabel,
      detail: [r.section, items.length ? items.join(', ') : null, stageName(r.stageCode)].filter(Boolean).join(' · '),
    });
  }
  return gaps;
}
