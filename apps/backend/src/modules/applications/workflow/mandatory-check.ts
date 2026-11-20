import {customerFields, DEED_SECTION, picFields, profileFields, screenOfForm} from '@liugong/shared';

/**
 * Mandatory-field check for every section of the FAP form, driven by the workflow's rules
 * (crm_workflow_stage_fields). Pure functions over the application detail.
 *
 * Each section knows where its data lives in the detail (a single object, or a list of items) and how a catalog
 * field key maps to a value. A key that no section can read is "not enforceable"; the Workflow setup page shows it
 * disabled instead of pretending to check it.
 */
/**
 * One required field of a workflow stage, as the master form tables describe it: the form, the section (by its code, never by its name), the field key and
 * whether the master marks it enforceable (crm_master_form_fields.is_enforceable).
 */
export type FieldRule = {stageCode: string; formCode: string; sectionCode: string; section: string; fieldKey: string; fieldLabel: string; enforceable: boolean};
export type Gap = {target: 'FAP_FORM' | 'PRE_ANALYSIS' | 'LEGAL' | 'DOCUMENTS'; label: string; detail?: string};

type Entry = {item: string | null; value: unknown};
type Section = {
  /** Where the screen should send the user. */
  target: Gap['target'];
  /** Optional: the keys this reader knows how to read. Without it every enforceable key of the section is read by its key. */
  has?: (key: string) => boolean;
  /** One entry per item (a single entry for single-object sections); no entries when the list is empty. */
  read: (detail: any, key: string) => Entry[];
  /** Keys whose "empty" means false rather than blank. */
  booleanKeys?: Set<string>;
  /** For a section of repeating rows: true when there is no row at all (the section then needs at least one row). */
  noRows?: (detail: any) => boolean;
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
  name: (item: any, i: number) => string,
  rename: (k: string) => string = k => k,
  target: Gap['target'] = 'FAP_FORM',
): Section => ({
  target,
  read: (d, key) => items(d).map((it, i) => ({item: name(it, i), value: get(it, rename(key))})),
  noRows: d => items(d).length === 0,
});

const DEED_ALIAS: Record<string, string> = {decreeNumber: 'ministerialDecreeNumber', decreeDate: 'ministerialDecreeDate'};
const STAKEHOLDER_ALIAS: Record<string, string> = {
  shareholderName: 'name',
  shareholderPosition: 'positions',
  shareAmount: 'depositedCapital',
  taxNumber: 'idNumberSecondary',
  nationalityType: 'citizenship',
};

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
  'DEBTOR-IDENTITY-CLASSIFICATION': own(),
  'REGISTRATION-OFFICE-COMPANY-DOMICILE': own(),
  'BUSINESS-PROFILE-DEED-LEGALITY': own(),
  'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC': own(true),
  'PURPOSE-OF-FINANCING-FIXED-ASSETS': {
    ...own(),
    has: key => ownKeys.has(key) || key === 'financingPurposeDetail',
  },
  'INDUSTRY-SEGMENTATION-ACTIVE-PROJECTS': list(d => d.projects || [], (_, i) => `proyek ${i + 1}`),
  'BANK-FACILITIES-REFERENCES': list(
    d => d.bankReferences || [],
    (_, i) => `bank ${i + 1}`,
    alias({referenceComments: 'comments'}),
  ),
  'FINANCING-PROPOSAL': PROPOSAL,
  'EQUIPMENT-UNITS': list(d => d.proposal?.units || [], (_, i) => `unit ${i + 1}`),
  'FINANCIAL-STATEMENTS': {
    ...list(d => d.financialStatements || [], (it, i) => `laporan ${it.fiscalYear ?? i + 1}`, alias({financialAudited: 'isAudited'})),
    booleanKeys: new Set(['financialAudited']),
  },
  [DEED_SECTION]: list(
    d => d.legal?.deeds || [],
    (it, i) => `akta ${it.deedNumber || i + 1}`,
    alias(DEED_ALIAS),
    'LEGAL',
  ),
  'SHAREHOLDERS-MANAGEMENT': {
    ...list(stakeholdersOf, (it, i) => `${it.name || `pemegang ${i + 1}`} (akta ${it.__deed || '-'})`, alias(STAKEHOLDER_ALIAS), 'LEGAL'),
    // "Minimum items" of this section is per deed: every deed needs that many stakeholders.
  },
};
// The section's own financingPurposeDetail field lives on the detail.
SECTIONS['PURPOSE-OF-FINANCING-FIXED-ASSETS'].read = (d, key) => [
  {item: null, value: key === 'financingPurposeDetail' ? d.financingPurposeDetail : [d.customer || {}, d].map((s: any) => s[key]).find(v => v !== undefined && v !== null && String(v).trim() !== '')},
];

/** The Pre-Analysis form is one JSON document of the application (detail.preAnalysis); its fields are read by their key. "Auto (generated on save)" is not a value. */
const PRE_ANALYSIS: Section = {
  target: 'PRE_ANALYSIS',
  read: (d, key) => {
    const v = d.preAnalysis?.[key];
    return [{item: null, value: typeof v === 'string' && v.includes('Auto') ? '' : v}];
  },
};

/** The reader of a section: by the section code, and for a form that has no reader of its own the reader of its screen (so a new Pre-Analysis section needs no code). */
const sectionFor = (r: FieldRule): Section | undefined => SECTIONS[r.sectionCode] ?? (screenOfForm(r.formCode) === 'PRE_ANALYSIS' ? PRE_ANALYSIS : undefined);

const isEmpty = (v: unknown, boolean: boolean) =>
  boolean ? !v : v === undefined || v === null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');

/**
 * What is missing for the mandatory field rules of a workflow. `detail` is the application detail
 * (customer, profile, pic, projects, bankReferences, financingProposal, proposal.units, financialStatements, legal).
 */
export function mandatoryGaps(detail: any, rules: FieldRule[], stageName: (code: string) => string | undefined): Gap[] {
  const gaps: Gap[] = [];
  const noRows = new Set<string>();
  for (const r of rules) {
    const section = sectionFor(r);
    // The master decides what is enforceable (is_enforceable); a reader that lists its keys can still refuse one it cannot read.
    if (!section || !r.enforceable || (section.has && !section.has(r.fieldKey))) continue;
    // A required field on a section of repeating rows means the section needs at least one row (one gap per section, not per field).
    if (section.noRows?.(detail)) {
      if (!noRows.has(r.sectionCode)) {
        noRows.add(r.sectionCode);
        gaps.push({target: section.target, label: `Minimal satu data di ${r.section}`, detail: stageName(r.stageCode)});
      }
      continue;
    }
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
