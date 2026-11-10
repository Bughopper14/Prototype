/** Pushes the sheet values into the FAP document inside the iframe, one document section at a time. */
import {createCellWriters} from '@/features/fap/lib/sheet/cell-writers';
import {applyIdentityAndCustomer} from '@/features/fap/lib/sheet/sections/identity';
import {applyCustomerProfile} from '@/features/fap/lib/sheet/sections/customer-profile';
import {applyFinancingPurpose} from '@/features/fap/lib/sheet/sections/financing-purpose';
import {applyFixedAssets} from '@/features/fap/lib/sheet/sections/fixed-assets';
import {applyReferences} from '@/features/fap/lib/sheet/sections/references';
import {applyProjects} from '@/features/fap/lib/sheet/sections/projects';
import {applyProposalAndTerms} from '@/features/fap/lib/sheet/sections/proposal-terms';
import {applyRealizationPlan} from '@/features/fap/lib/sheet/sections/realization-plan';
import {applyNotes} from '@/features/fap/lib/sheet/sections/notes';
import {applyDocumentChecklist} from '@/features/fap/lib/sheet/sections/document-checklist';
import {applyShareholders} from '@/features/fap/lib/sheet/sections/shareholders';
import {applyFinancialStatements} from '@/features/fap/lib/sheet/sections/financial-statements';
import {applyDebtorSignature} from '@/features/fap/lib/sheet/sections/debtor-signature';
import {attachCellClickListeners} from '@/features/fap/lib/sheet/sections/cell-click';
import {highlightDiffCells} from '@/features/fap/lib/sheet/sections/diff-highlight';
import {fitCustomerBox} from '@/features/fap/lib/sheet/sections/customer-box-height';
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {FapSheetPreviewProps} from '@/features/fap/lib/types';
import type {useMasterData} from '@/shared/master-data';

export function syncIframeValues({
  iframe,
  d,
  props,
  zoomLevel,
  master,
}: {
  iframe: HTMLIFrameElement | null;
  d: SheetValues;
  props: FapSheetPreviewProps;
  zoomLevel: number;
  master: ReturnType<typeof useMasterData>;
}) {
  if (!iframe || !iframe.contentDocument) return;
  const doc = iframe.contentDocument;

  // Apply zoom
  if (doc.body) {
    doc.body.style.zoom = String(zoomLevel);
    doc.body.style.background = '#ffffff';
  }

  if (iframe.contentWindow) {
    iframe.contentWindow.onbeforeprint = () => {
      if (doc.body) doc.body.style.zoom = '0.175';
    };
    iframe.contentWindow.onafterprint = () => {
      if (doc.body) doc.body.style.zoom = String(zoomLevel);
    };
  }
  const {isNoneVal, setText, formatFapDate} = createCellWriters(doc);

  applyIdentityAndCustomer({d, props, setText, isNoneVal, formatFapDate});
  applyCustomerProfile({d, setText});
  applyFinancingPurpose({d, setText});
  applyFixedAssets({d, props, setText, isNoneVal});
  applyReferences({d, setText, isNoneVal});
  applyProjects({d, setText, isNoneVal});
  applyProposalAndTerms({doc, d, setText});
  applyRealizationPlan({d, setText});
  applyNotes({doc, d});
  applyDocumentChecklist({doc, d});
  applyShareholders({d, setText});
  applyFinancialStatements({doc, d, setText});
  applyDebtorSignature({d, setText});
  attachCellClickListeners({doc, d, props});
  highlightDiffCells({doc, props});
  fitCustomerBox({doc});
}
