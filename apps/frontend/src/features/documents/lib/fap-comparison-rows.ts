/** Builds normalized comparison rows (differences + matches) and section metadata for the Documents tab. */

export type FapSectionDef = {
  id: string;
  shortLabel: string;
  pillLabel: string;
  fields: string[];
};

export const FAP_SECTIONS: FapSectionDef[] = [
  {
    id: 'fap-preview-sec-header',
    shortLabel: 'Identity',
    pillLabel: '1 Identity',
    fields: [
      'fapNumber',
      'applicationDate',
      'branchCode',
      'customerCategory',
      'customerStatus',
      'companyName',
      'companyType',
      'nib',
      'nibDate',
      'npwp',
      'debtorSignature',
    ],
  },
  {
    id: 'fap-preview-sec-company',
    shortLabel: 'Domicile',
    pillLabel: '2 Domicile',
    fields: [
      'locationStatus',
      'companyAddress',
      'province',
      'city',
      'district',
      'village',
      'postalCode',
      'rt',
      'rw',
      'phoneFax',
      'email',
      'website',
    ],
  },
  {
    id: 'fap-preview-sec-business',
    shortLabel: 'Profile',
    pillLabel: '3 Profile',
    fields: [
      'mainBusiness',
      'establishmentActNo',
      'establishmentDate',
      'experienceYears',
      'experienceMonths',
      'latestDeedNo',
      'latestDeedDate',
      'repaymentSource',
      'industrySegment',
      'businessRole',
    ],
  },
  {
    id: 'fap-preview-sec-pic',
    shortLabel: 'PIC',
    pillLabel: '4 PIC',
    fields: [
      'picName',
      'picPosition',
      'position',
      'picPhone',
      'phone',
      'picEmail',
      'picAddress',
      'currentAddress',
      'picCity',
      'picProvince',
      'picPostalCode',
      'representativeType',
      'idNumber',
    ],
  },
  {
    id: 'fap-preview-sec-purpose-assets',
    shortLabel: 'Purpose',
    pillLabel: '5 Purpose',
    fields: [
      'financingPurposeDetail',
      'assetSummaryHeLiuGong',
      'assetSummaryTruckLiuGong',
      'assetSummaryHeNonLiuGong',
      'assetSummaryTruckNonLiuGong',
    ],
  },
  {
    id: 'fap-preview-sec-projects',
    shortLabel: 'Projects',
    pillLabel: '6 Projects',
    fields: [
      'shareholders',
      'stakeholderType',
      'projectName',
      'projectOwner',
      'projectValue',
      'contractNumber',
      'projects',
    ],
  },
  {
    id: 'fap-preview-sec-banks',
    shortLabel: 'References',
    pillLabel: '7 References',
    fields: [
      'bankOrFinInstitution',
      'creditFacility',
      'monthlyInstallment',
      'yearStarted',
      'paymentRecord',
      'facilityStatus',
      'referenceComments',
      'comments',
      'totalMonthlyInstallment',
    ],
  },
  {
    id: 'fap-preview-sec-proposal',
    shortLabel: 'Financing',
    pillLabel: '8 Financing',
    fields: [
      'financingValue',
      'financingValueProp',
      'downPaymentValue',
      'tenorMonths',
      'interestRate',
      'facilityPurpose',
      'financingMethod',
      'paymentMethod',
      'currency',
      'currencyChoice',
      'applicationSource',
      'proposalNotes',
    ],
  },
  {
    id: 'fap-preview-sec-financial',
    shortLabel: 'Financials',
    pillLabel: '9 Financials',
    fields: ['totalAssets', 'totalLiabilities', 'totalEquity', 'revenue', 'netIncome'],
  },
];

const STANDARD_FIELDS: {field: string; label: string; sectionId: string}[] = [
  {field: 'applicationDate', label: 'Application date', sectionId: 'fap-preview-sec-header'},
  {field: 'branchCode', label: 'Branch', sectionId: 'fap-preview-sec-header'},
  {field: 'customerStatus', label: 'Customer status', sectionId: 'fap-preview-sec-header'},
  {field: 'companyName', label: 'Company name', sectionId: 'fap-preview-sec-header'},
  {field: 'companyType', label: 'Business category', sectionId: 'fap-preview-sec-header'},
  {field: 'nib', label: 'NIB', sectionId: 'fap-preview-sec-header'},
  {field: 'npwp', label: 'NPWP', sectionId: 'fap-preview-sec-header'},
  {field: 'companyAddress', label: 'Company address', sectionId: 'fap-preview-sec-company'},
  {field: 'locationStatus', label: 'Location status', sectionId: 'fap-preview-sec-company'},
  {field: 'city', label: 'City', sectionId: 'fap-preview-sec-company'},
  {field: 'province', label: 'Province', sectionId: 'fap-preview-sec-company'},
  {field: 'postalCode', label: 'Postal code', sectionId: 'fap-preview-sec-company'},
  {field: 'phoneFax', label: 'Phone / Fax', sectionId: 'fap-preview-sec-company'},
  {field: 'email', label: 'Company email', sectionId: 'fap-preview-sec-company'},
  {field: 'website', label: 'Website', sectionId: 'fap-preview-sec-company'},
  {field: 'mainBusiness', label: 'Main business', sectionId: 'fap-preview-sec-business'},
  {field: 'establishmentActNo', label: 'Establishment deed no.', sectionId: 'fap-preview-sec-business'},
  {field: 'establishmentDate', label: 'Establishment date', sectionId: 'fap-preview-sec-business'},
  {field: 'experienceYears', label: 'Experience (years)', sectionId: 'fap-preview-sec-business'},
  {field: 'experienceMonths', label: 'Experience (months)', sectionId: 'fap-preview-sec-business'},
  {field: 'latestDeedNo', label: 'Latest deed no.', sectionId: 'fap-preview-sec-business'},
  {field: 'latestDeedDate', label: 'Latest deed date', sectionId: 'fap-preview-sec-business'},
  {field: 'repaymentSource', label: 'Repayment source', sectionId: 'fap-preview-sec-business'},
  {field: 'picName', label: 'PIC name', sectionId: 'fap-preview-sec-pic'},
  {field: 'picPosition', label: 'PIC position', sectionId: 'fap-preview-sec-pic'},
  {field: 'picPhone', label: 'PIC phone', sectionId: 'fap-preview-sec-pic'},
  {field: 'picEmail', label: 'PIC email', sectionId: 'fap-preview-sec-pic'},
  {field: 'picAddress', label: 'PIC address', sectionId: 'fap-preview-sec-pic'},
  {field: 'picCity', label: 'PIC city', sectionId: 'fap-preview-sec-pic'},
  {field: 'picProvince', label: 'PIC province', sectionId: 'fap-preview-sec-pic'},
  {field: 'picPostalCode', label: 'PIC postal code', sectionId: 'fap-preview-sec-pic'},
  {field: 'facilityPurpose', label: 'Facility purpose', sectionId: 'fap-preview-sec-proposal'},
  {field: 'financingValue', label: 'Financing value', sectionId: 'fap-preview-sec-proposal'},
  {field: 'downPaymentValue', label: 'Down payment', sectionId: 'fap-preview-sec-proposal'},
  {field: 'tenorMonths', label: 'Tenor (months)', sectionId: 'fap-preview-sec-proposal'},
  {field: 'interestRate', label: 'Interest rate (%)', sectionId: 'fap-preview-sec-proposal'},
  {field: 'financingMethod', label: 'Financing method', sectionId: 'fap-preview-sec-proposal'},
  {field: 'paymentMethod', label: 'Payment method', sectionId: 'fap-preview-sec-proposal'},
  {field: 'currency', label: 'Currency', sectionId: 'fap-preview-sec-proposal'},
  {field: 'applicationSource', label: 'Application source', sectionId: 'fap-preview-sec-proposal'},
];

export type ComparisonRow = {
  field: string;
  label: string;
  sectionId: string;
  sectionLabel: string;
  systemValue: string;
  ocrValue: string;
  status: 'noted' | 'different' | 'match';
};

export function resolveSectionForField(field: string, rawSection?: string): FapSectionDef {
  const sec = (rawSection || '').toLowerCase();
  if (sec.includes('bank') || sec.includes('reference')) {
    return FAP_SECTIONS.find(s => s.id === 'fap-preview-sec-banks')!;
  }
  if (sec.includes('proposal') || sec.includes('financ')) {
    return FAP_SECTIONS.find(s => s.id === 'fap-preview-sec-proposal')!;
  }
  if (field.startsWith('stakeholder_') || field.startsWith('shareholder_') || sec.includes('project')) {
    return FAP_SECTIONS.find(s => s.id === 'fap-preview-sec-projects')!;
  }
  const byField = FAP_SECTIONS.find(s => s.fields.includes(field));
  return byField || FAP_SECTIONS[0];
}

function toText(v: any): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return '';
  const s = String(v).trim();
  if (s === '—' || s === '-' || /^—\s*\(kosong di dokumen\)$/i.test(s)) return '';
  return s;
}

function normMatch(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function buildComparisonRows(
  fapComparison: any,
  liveFapData: Record<string, any> | null,
  ocrFapData: Record<string, any> | null,
): ComparisonRow[] {
  const diffs: any[] = Array.isArray(fapComparison?.diffs) ? fapComparison.diffs : [];
  const diffByField = new Map<string, any>();
  for (const d of diffs) {
    if (d?.field) diffByField.set(d.field, d);
  }

  const rows: ComparisonRow[] = [];
  const seen = new Set<string>();

  // 1. Standard fields in canonical order (preserving matches AND diffs in clean section order)
  for (const def of STANDARD_FIELDS) {
    const diff = diffByField.get(def.field);
    if (diff) {
      const sec = resolveSectionForField(diff.field, diff.section);
      rows.push({
        field: diff.field,
        label: def.label || diff.label || diff.field,
        sectionId: sec.id,
        sectionLabel: sec.shortLabel,
        systemValue: toText(diff.oldValue),
        ocrValue: toText(diff.newValue),
        status: diff.noted ? 'noted' : 'different',
      });
      seen.add(def.field);
    } else if (liveFapData && ocrFapData) {
      const sysVal = toText(liveFapData[def.field]);
      const ocrVal = toText(ocrFapData[def.field]);
      // Only include as Match when both sides exist and genuinely match (not missing/mismatched keys)
      if (sysVal && ocrVal && normMatch(sysVal) === normMatch(ocrVal)) {
        const sec = FAP_SECTIONS.find(s => s.id === def.sectionId) || FAP_SECTIONS[0];
        rows.push({
          field: def.field,
          label: def.label,
          sectionId: sec.id,
          sectionLabel: sec.shortLabel,
          systemValue: sysVal,
          ocrValue: ocrVal,
          status: 'match',
        });
        seen.add(def.field);
      }
    }
  }

  // 2. Any remaining diffs from OCR that aren't in STANDARD_FIELDS (e.g. stakeholders, bank refs, custom)
  for (const d of diffs) {
    if (!d?.field || seen.has(d.field)) continue;
    const sec = resolveSectionForField(d.field, d.section);
    rows.push({
      field: d.field,
      label: d.label || d.field,
      sectionId: sec.id,
      sectionLabel: sec.shortLabel,
      systemValue: toText(d.oldValue),
      ocrValue: toText(d.newValue),
      status: d.noted ? 'noted' : 'different',
    });
    seen.add(d.field);
  }

  return rows;
}
