/** Unit realization plan counts. */
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';

export function applyRealizationPlan({d, setText}: {d: SheetValues; setText: CellWriters['setText']}) {
  const prop = d.financingProposal || {};
  // Unit Realization Plan
  const rPlan = prop.realizationPlan || {};

  const rpLgHe = Number(rPlan.lgHe) || 0;

  const rpLgTruck = Number(rPlan.lgTruck) || 0;

  const rpLgUnit = rpLgHe + rpLgTruck;

  const rpNlgHe = Number(rPlan.nlgHe) || 0;

  const rpNlgTruck = Number(rPlan.nlgTruck) || 0;

  const rpNlgUnit = rpNlgHe + rpNlgTruck;

  const rpTotUnit = rpLgUnit + rpNlgUnit;

  setText('fap-cell-prop-asset-lg-he', rpLgHe ? String(rpLgHe) : '');

  setText('fap-cell-prop-asset-lg-truck', rpLgTruck ? String(rpLgTruck) : '');

  setText('fap-cell-prop-asset-lg-unit', rpLgUnit ? String(rpLgUnit) : '');

  setText('fap-cell-prop-asset-nlg-he', rpNlgHe ? String(rpNlgHe) : '');

  setText('fap-cell-prop-asset-nlg-truck', rpNlgTruck ? String(rpNlgTruck) : '');

  setText('fap-cell-prop-asset-nlg-unit', rpNlgUnit ? String(rpNlgUnit) : '');

  setText('fap-cell-prop-asset-tot-unit', rpTotUnit ? String(rpTotUnit) : '');
}
