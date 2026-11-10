/** Company name in the debtor signature block. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';

export function applyDebtorSignature({d, setText}: {d: SheetValues; setText: CellWriters['setText']}) {
  // Debtor signature company name
  const debtorComp = String(d.companyName || '').trim();

  let debtorDisplay = 'PT.';

  if (debtorComp) {
    debtorDisplay = /^PT[\.\s]/i.test(debtorComp)
      ? debtorComp.toUpperCase()
      : `PT. ${debtorComp.toUpperCase()}`;
  }

  setText('fap-cell-sign-debtor-company', debtorDisplay);
}
