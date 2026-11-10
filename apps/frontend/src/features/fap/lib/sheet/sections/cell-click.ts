/** Makes every data cell clickable so the form can jump to the matching field. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {FapSheetPreviewProps} from '@/features/fap/lib/types';
import {FIELD_TO_CELL_ID_MAP} from '@/features/fap/lib/field-cells';
import {CELL_ID_TO_SECTION_MAP} from '@/features/fap/lib/section-cells';

export function attachCellClickListeners({
  doc,
  d,
  props,
}: {
  doc: Document;
  d: SheetValues;
  props: FapSheetPreviewProps;
}) {
  // Attach click listeners to all data cells
  const cells = doc.querySelectorAll('[id^="fap-cell-"]');

  cells.forEach(cell => {
    (cell as HTMLElement).style.cursor = 'pointer';
    (cell as HTMLElement).title = 'Click to focus this field in form';
    (cell as HTMLElement).onclick = e => {
      e.stopPropagation();
      const id = (cell as HTMLElement).id;
      let matchedField = Object.entries(FIELD_TO_CELL_ID_MAP).find(([_, v]) => v === id)?.[0] || '';
      let matchedSection = CELL_ID_TO_SECTION_MAP[id] || '';
      let extraMeta: any = {};

      const projMatch = id.match(/^fap-cell-proj-(\d+)-(owner|loc|role|status)$/);
      if (projMatch) {
        const rIdx = parseInt(projMatch[1], 10);
        const col = projMatch[2];
        matchedSection = 'fap-preview-sec-projects';
        extraMeta = {rowIndex: rIdx, sectionContext: `projects-${rIdx}`, repeater: 'projects'};
        if (col === 'owner') matchedField = 'projectOwner';
        else if (col === 'loc') matchedField = 'projectLocation';
        else if (col === 'role') matchedField = 'projectRole';
        else if (col === 'status') matchedField = 'contractStatus';
      }

      const refMatch = id.match(
        /^fap-cell-ref-(\d+)-(no|bank|currency|credit|installment|year|rate|record|status)$/,
      );
      if (refMatch) {
        const rIdx = parseInt(refMatch[1], 10);
        const col = refMatch[2];
        matchedSection = 'fap-preview-sec-banks';
        extraMeta = {rowIndex: rIdx, sectionContext: `banks-${rIdx}`, repeater: 'banks'};
        if (col === 'no' || col === 'bank') matchedField = 'bankOrFinInstitution';
        else if (col === 'currency') matchedField = 'currency';
        else if (col === 'credit') matchedField = 'creditFacility';
        else if (col === 'installment') matchedField = 'monthlyInstallment';
        else if (col === 'year') matchedField = 'yearStarted';
        else if (col === 'rate') matchedField = 'interestRate';
        else if (col === 'record') matchedField = 'paymentRecord';
        else if (col === 'status') matchedField = 'facilityStatus';
      }

      if (id === 'fap-cell-sign-debtor-company') {
        matchedSection = 'fap-preview-sec-header';
        matchedField = 'companyName';
      }

      if (id === 'fap-cell-fin-audited') {
        matchedSection = 'fap-preview-sec-financial';
        matchedField = 'financialAudited';
        extraMeta = {sectionContext: 'financial'};
      }

      const finMatch = id.match(
        /^fap-cell-fin-(bs-yr|is-yr|cur-asset|noncur-asset|tot-asset|cur-liab|noncur-liab|tot-liab|equity|tot-liab-equity|revenue|gross-profit|op-profit|tax|net-income)-(\d+)$/,
      );
      if (finMatch) {
        const metric = finMatch[1];
        const colIdx = parseInt(finMatch[2], 10);
        matchedSection = 'fap-preview-sec-financial';
        extraMeta = {rowIndex: colIdx, sectionContext: 'financial', repeater: 'financial'};
        if (metric === 'bs-yr' || metric === 'is-yr') matchedField = 'fiscalYear';
        else if (metric === 'cur-asset') matchedField = 'currentAssets';
        else if (metric === 'noncur-asset') matchedField = 'nonCurrentAssets';
        else if (metric === 'tot-asset') matchedField = 'totalAssets';
        else if (metric === 'cur-liab') matchedField = 'currentLiabilities';
        else if (metric === 'noncur-liab') matchedField = 'nonCurrentLiabilities';
        else if (metric === 'tot-liab') matchedField = 'totalLiabilities';
        else if (metric === 'equity') matchedField = 'equity';
        else if (metric === 'tot-liab-equity') matchedField = 'totalLiabAndEquity';
        else if (metric === 'revenue') matchedField = 'revenue';
        else if (metric === 'gross-profit') matchedField = 'grossMargin';
        else if (metric === 'op-profit') matchedField = 'operatingMargin';
        else if (metric === 'tax') matchedField = 'tax';
        else if (metric === 'net-income') matchedField = 'netIncome';
      }

      const propCellMap: Record<string, string> = {
        'fap-cell-prop-method': 'financingMethod',
        'fap-cell-prop-curr-choice': 'currencyChoice',
        'fap-cell-prop-val': 'financingValueProp',
        'fap-cell-prop-app-source': 'applicationSource',
        'fap-cell-tc-fl-purpose': 'flInvestment',
        'fap-cell-tc-fl-curr': 'flCurrency',
        'fap-cell-tc-fl-deposit': 'flDeposit',
        'fap-cell-tc-fl-rate': 'flRate',
        'fap-cell-tc-fl-tenor': 'flTenor',
        'fap-cell-tc-fl-payment': 'flPayment',
        'fap-cell-tc-slb-purpose': 'slbPurpose',
        'fap-cell-tc-slb-curr': 'slbCurrency',
        'fap-cell-tc-slb-deposit': 'slbDeposit',
        'fap-cell-tc-slb-rate': 'slbRate',
        'fap-cell-tc-slb-tenor': 'slbTenor',
        'fap-cell-tc-slb-payment': 'slbPayment',
        'fap-cell-tc-if-purpose': 'ifPurpose',
        'fap-cell-tc-if-curr': 'ifCurrency',
        'fap-cell-tc-if-dp': 'ifDownPayment',
        'fap-cell-tc-if-rate': 'ifRate',
        'fap-cell-tc-if-tenor': 'ifTenor',
        'fap-cell-tc-if-payment': 'ifPayment',
        // Unit Realization Plan
        'fap-cell-prop-asset-lg-he': 'propAssetLgHe',
        'fap-cell-prop-asset-lg-truck': 'propAssetLgTruck',
        'fap-cell-prop-asset-lg-unit': 'propAssetLgUnit',
        'fap-cell-prop-asset-nlg-he': 'propAssetNlgHe',
        'fap-cell-prop-asset-nlg-truck': 'propAssetNlgTruck',
        'fap-cell-prop-asset-nlg-unit': 'propAssetNlgUnit',
        'fap-cell-prop-asset-tot-unit': 'propAssetTotUnit',
        // Notes
        'fap-cell-prop-notes': 'proposalNotes',
        // Document Requirements
        'fap-cell-doc-company-profile': 'docReqCompanyProfile',
        'fap-cell-doc-legality': 'docReqLegality',
        'fap-cell-doc-deed': 'docReqDeed',
        'fap-cell-doc-decree': 'docReqDecree',
        'fap-cell-doc-copy-id': 'docReqCopyId',
        'fap-cell-doc-audited-financial': 'docReqAuditedFin',
        'fap-cell-doc-bank-statements': 'docReqBankStatements',
        'fap-cell-doc-bank-facility': 'docReqBankFacility',
        'fap-cell-doc-production-report': 'docReqProductionReport',
        'fap-cell-doc-fixed-assets': 'docReqFixedAssets',
        'fap-cell-doc-project-contracts': 'docReqProjectContracts',
      };
      if (propCellMap[id]) {
        matchedSection = 'fap-preview-sec-proposal';
        matchedField = propCellMap[id];
        extraMeta = {sectionContext: 'proposal'};
      }

      if (id === 'fap-cell-ref-total-installment') {
        matchedSection = 'fap-preview-sec-banks';
        matchedField = 'totalMonthlyInstallment';
        extraMeta = {sectionContext: 'banks'};
      } else if (id === 'fap-cell-ref-comments') {
        matchedSection = 'fap-preview-sec-banks';
        matchedField = 'referenceComments';
        extraMeta = {sectionContext: 'banks'};
      }

      if (!matchedField) {
        if (id.startsWith('fap-cell-seg-')) matchedField = 'industrySegment';
        else if (id.startsWith('fap-cell-role-')) matchedField = 'businessRole';
      }

      if (props.onPreviewCellClick) {
        props.onPreviewCellClick(matchedField, matchedSection, extraMeta);
      } else if (matchedSection && props.onSectionClick) {
        props.onSectionClick(matchedSection);
      }
    };
  });
}
