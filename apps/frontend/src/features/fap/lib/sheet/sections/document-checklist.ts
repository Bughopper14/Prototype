/** Document requirement check boxes. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';

export function applyDocumentChecklist({doc, d}: {doc: Document; d: SheetValues}) {
  const prop = d.financingProposal || {};
  // Document Requirements Checklist
  const docReq = prop.documentRequirements || (d as any).documentRequirements || {};

  const setDocBox = (id: string, isChecked: boolean) => {
    const el = doc.getElementById(id);
    if (el) {
      el.innerHTML = isChecked
        ? '<div style="text-align:center;font-weight:bold;font-size:48pt;color:#002060;line-height:1;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Arial,sans-serif;">✓</div>'
        : '';
    }
  };

  setDocBox('fap-cell-doc-company-profile', !!docReq.companyProfile);

  setDocBox('fap-cell-doc-legality', !!docReq.legality);

  setDocBox('fap-cell-doc-deed', !!docReq.deedEstablishment);

  setDocBox('fap-cell-doc-decree', !!docReq.decreeMinistryOfLaw);

  setDocBox('fap-cell-doc-copy-id', !!docReq.copyIdBodShareholder);

  setDocBox('fap-cell-doc-audited-financial', !!docReq.auditedFinancialStatements);

  setDocBox('fap-cell-doc-bank-statements', !!docReq.bankStatements);

  setDocBox('fap-cell-doc-bank-facility', !!docReq.bankFinancingFacility);

  setDocBox('fap-cell-doc-production-report', !!docReq.productionReport);

  setDocBox('fap-cell-doc-fixed-assets', !!docReq.listOfFixedAssets);

  setDocBox('fap-cell-doc-project-contracts', !!docReq.projectContracts);
}
