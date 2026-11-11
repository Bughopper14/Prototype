/** Fixed assets summary table and the location status. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {FapSheetPreviewProps} from '@/features/fap/lib/types';
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';

export function applyFixedAssets({
  d,
  props,
  setText,
  isNoneVal,
}: {
  d: SheetValues;
  props: FapSheetPreviewProps;
  setText: CellWriters['setText'];
  isNoneVal: CellWriters['isNoneVal'];
}) {
  // List Fixed Assets Summary Table
  const lgHe = Number((d as any).assetSummaryHeLiuGong) || 0;

  const lgTruck = Number((d as any).assetSummaryTruckLiuGong) || 0;

  const nlgHe = Number((d as any).assetSummaryHeNonLiuGong) || 0;

  const nlgTruck = Number((d as any).assetSummaryTruckNonLiuGong) || 0;

  const lgUnit = lgHe + lgTruck;

  const nlgUnit = nlgHe + nlgTruck;

  const totHe = lgHe + nlgHe;

  const totTruck = lgTruck + nlgTruck;

  const totUnit = lgUnit + nlgUnit;

  const lgPct = totUnit > 0 ? ((lgUnit / totUnit) * 100).toFixed(1) + '%' : '0.0%';

  const nlgPct = totUnit > 0 ? ((nlgUnit / totUnit) * 100).toFixed(1) + '%' : '0.0%';

  const totPct = totUnit > 0 ? '100.0%' : '0.0%';

  const hasAnyAssets = totUnit > 0;

  if (hasAnyAssets && !(props.diffSide === 'ocr' && totUnit === 0)) {
    setText(
      'fap-cell-asset-lg-he',
      lgHe > 0 || (d as any).assetSummaryHeLiuGong !== undefined ? String(lgHe) : '',
    );
    setText(
      'fap-cell-asset-lg-truck',
      lgTruck > 0 || (d as any).assetSummaryTruckLiuGong !== undefined ? String(lgTruck) : '',
    );
    setText('fap-cell-asset-lg-unit', totUnit > 0 ? String(lgUnit) : '');
    setText('fap-cell-asset-lg-pct', totUnit > 0 ? lgPct : '');

    setText(
      'fap-cell-asset-nlg-he',
      nlgHe > 0 || (d as any).assetSummaryHeNonLiuGong !== undefined ? String(nlgHe) : '',
    );
    setText(
      'fap-cell-asset-nlg-truck',
      nlgTruck > 0 || (d as any).assetSummaryTruckNonLiuGong !== undefined ? String(nlgTruck) : '',
    );
    setText('fap-cell-asset-nlg-unit', totUnit > 0 ? String(nlgUnit) : '');
    setText('fap-cell-asset-nlg-pct', totUnit > 0 ? nlgPct : '');

    setText('fap-cell-asset-tot-he', totUnit > 0 ? String(totHe) : '');
    setText('fap-cell-asset-tot-truck', totUnit > 0 ? String(totTruck) : '');
    setText('fap-cell-asset-tot-unit', totUnit > 0 ? String(totUnit) : '');
    setText('fap-cell-asset-tot-pct', totUnit > 0 ? totPct : '');
  } else {
    setText('fap-cell-asset-lg-he', '');
    setText('fap-cell-asset-lg-truck', '');
    setText('fap-cell-asset-lg-unit', '');
    setText('fap-cell-asset-lg-pct', '');
    setText('fap-cell-asset-nlg-he', '');
    setText('fap-cell-asset-nlg-truck', '');
    setText('fap-cell-asset-nlg-unit', '');
    setText('fap-cell-asset-nlg-pct', '');
    setText('fap-cell-asset-tot-he', '');
    setText('fap-cell-asset-tot-truck', '');
    setText('fap-cell-asset-tot-unit', '');
    setText('fap-cell-asset-tot-pct', '');
  }

  const locStatus = String(d.locationStatus || '')
    .toUpperCase()
    .trim();

  const displayLocationStatus =
    locStatus === 'OWNED'
      ? 'Owned'
      : locStatus === 'RENTED'
        ? 'Rented'
        : locStatus === 'OTHERS' || locStatus === 'OTHER'
          ? 'Others'
          : isNoneVal(locStatus)
            ? ''
            : d.locationStatus || '';

  setText('fap-cell-locationStatus', displayLocationStatus);
}
