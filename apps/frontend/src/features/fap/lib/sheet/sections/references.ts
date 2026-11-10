/** Bank facilities (references) table, up to 5 rows. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';

export function applyReferences({
  d,
  setText,
  isNoneVal,
}: {
  d: SheetValues;
  setText: CellWriters['setText'];
  isNoneVal: CellWriters['isNoneVal'];
}) {
  // References (Bank Facilities / Fasilitas Bank table) up to 5 rows
  const refList = d.bankReferences || [];

  let totalMonthlyInstallment = 0;

  for (let i = 0; i < 5; i++) {
    const item = refList[i];
    if (item) {
      setText(`fap-cell-ref-${i}-no`, String(i + 1));
      setText(`fap-cell-ref-${i}-bank`, item.bankOrFinInstitution || '');
      setText(`fap-cell-ref-${i}-currency`, item.currency || 'IDR');
      setText(
        `fap-cell-ref-${i}-credit`,
        item.creditFacility ? Number(item.creditFacility).toLocaleString('id-ID') : '',
      );
      const instVal = Number(item.monthlyInstallment) || 0;
      totalMonthlyInstallment += instVal;
      setText(`fap-cell-ref-${i}-installment`, instVal ? instVal.toLocaleString('id-ID') : '');
      setText(`fap-cell-ref-${i}-year`, item.yearStarted ? String(item.yearStarted) : '');
      setText(
        `fap-cell-ref-${i}-rate`,
        item.interestRate !== undefined && item.interestRate !== '' ? `${item.interestRate}%` : '',
      );
      setText(`fap-cell-ref-${i}-record`, item.paymentRecord || '');
      const facStatus = (item.facilityStatus || item.status || '').trim();
      setText(`fap-cell-ref-${i}-status`, isNoneVal(facStatus) ? '' : facStatus);
    } else {
      setText(`fap-cell-ref-${i}-no`, '');
      setText(`fap-cell-ref-${i}-bank`, '');
      setText(`fap-cell-ref-${i}-currency`, '');
      setText(`fap-cell-ref-${i}-credit`, '');
      setText(`fap-cell-ref-${i}-installment`, '');
      setText(`fap-cell-ref-${i}-year`, '');
      setText(`fap-cell-ref-${i}-rate`, '');
      setText(`fap-cell-ref-${i}-record`, '');
      setText(`fap-cell-ref-${i}-status`, '');
    }
  }

  setText(
    'fap-cell-ref-total-installment',
    totalMonthlyInstallment > 0 ? totalMonthlyInstallment.toLocaleString('id-ID') : '',
  );

  setText('fap-cell-ref-comments', d.referenceComments || '');
}
