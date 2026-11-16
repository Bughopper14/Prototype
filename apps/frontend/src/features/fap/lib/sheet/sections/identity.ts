/** FAP number, date, branch, customer status and the company / PIC contact cells. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {FapSheetPreviewProps} from '@/features/fap/lib/types';
import {CHECKBOX_CELLS} from '@/features/fap/lib/field-cells';
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';

export function applyIdentityAndCustomer({
  d,
  props,
  setText,
  isNoneVal,
  formatFapDate,
}: {
  d: SheetValues;
  props: FapSheetPreviewProps;
  setText: CellWriters['setText'];
  isNoneVal: CellWriters['isNoneVal'];
  formatFapDate: CellWriters['formatFapDate'];
}) {
  setText('fap-cell-fapNumber', d.fapNumber);

  setText('fap-cell-applicationDate', formatFapDate(d.applicationDate));

  setText('fap-cell-branchCode', d.branchCode);

  const noStatus = (props.diffSide === 'ocr' && !d.customerStatus) || isNoneVal(d.customerStatus);
  for (const [code, cell] of Object.entries(CHECKBOX_CELLS.customerCategory))
    setText(cell, !noStatus && d.customerStatus === code ? '✓' : '');
  for (const [code, cell] of Object.entries(CHECKBOX_CELLS.companyType)) setText(cell, d.companyType === code ? '✓' : '');

  setText('fap-cell-companyName', d.companyName);

  setText('fap-cell-picName', d.picName);

  setText('fap-cell-phone', d.phone);

  setText('fap-cell-companyAddress', d.companyAddress);

  setText('fap-cell-position', d.position);

  setText('fap-cell-picEmail', d.picEmail);

  setText('fap-cell-city', d.city);

  setText('fap-cell-currentAddress', d.currentAddress);

  setText('fap-cell-province', d.province);

  setText('fap-cell-postalCode', d.postalCode);

  setText('fap-cell-picCity', d.picCity);

  setText('fap-cell-mainBusiness', d.mainBusiness);
}
