/** Document requirement check boxes: one sheet cell (param_key) per requirement of Master Data. */
import type {MasterCatalog} from '@liugong/shared';
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';

export function applyDocumentChecklist({doc, d, master}: {doc: Document; d: SheetValues; master: MasterCatalog}) {
  const prop = d.financingProposal || {};
  const docReq = prop.documentRequirements || (d as any).documentRequirements || {};
  for (const requirement of master.fapDocumentRequirement || []) {
    const el = requirement.paramKey ? doc.getElementById(requirement.paramKey) : null;
    if (!el) continue;
    el.innerHTML = docReq[requirement.value]
      ? '<div style="text-align:center;font-weight:bold;font-size:48pt;color:#002060;line-height:1;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Arial,sans-serif;">✓</div>'
      : '';
  }
}
