/** FAP number, date, branch, customer status and the company / PIC contact cells. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {FapSheetPreviewProps} from '@/features/fap/lib/types';
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

  const custStatusUpper = String(d.customerStatus || '').toUpperCase();

  if ((props.diffSide === 'ocr' && !custStatusUpper) || isNoneVal(custStatusUpper)) {
    setText('fap-cell-custNew', '');
    setText('fap-cell-custExisting', '');
  } else {
    const isNew = custStatusUpper.includes('NEW') || custStatusUpper.includes('BARU');
    const isExisting = custStatusUpper.includes('EXISTING') || custStatusUpper.includes('LAMA');
    setText('fap-cell-custNew', isNew ? '✓' : '');
    setText('fap-cell-custExisting', isExisting ? '✓' : '');
  }

  const compTypeUpper = String(d.companyType || '').toUpperCase();

  const isCorp =
    compTypeUpper.includes('CORPORATE') ||
    compTypeUpper.includes('PT') ||
    compTypeUpper.includes('PERSEROAN');

  const isComm =
    compTypeUpper.includes('COMMERCIAL') || compTypeUpper.includes('CV') || compTypeUpper.includes('FIRMA');

  const isMicro = compTypeUpper.includes('MICRO') || compTypeUpper.includes('MIKRO');

  const isLiuGongUser =
    compTypeUpper.includes('LIUGONG') || compTypeUpper.includes('USER') || compTypeUpper.includes('USED');

  setText('fap-cell-corporate', isCorp ? '✓' : '');

  setText('fap-cell-commercial', isComm ? '✓' : '');

  setText('fap-cell-micro', isMicro ? '✓' : '');

  setText('fap-cell-liugongUser', isLiuGongUser ? '✓' : '');

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
