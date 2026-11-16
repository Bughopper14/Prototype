/** Industry segmentation, business role checkboxes and the legal / contact cells of the customer. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import {CHECKBOX_CELLS} from '@/features/fap/lib/field-cells';
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';

export function applyCustomerProfile({d, setText}: {d: SheetValues; setText: CellWriters['setText']}) {
  // Checkboxes: one cell per master code, ticked when the application holds that code
  for (const field of ['industrySegment', 'businessRole'] as const)
    for (const [code, cell] of Object.entries(CHECKBOX_CELLS[field])) setText(cell, d[field] === code ? '✓' : '');

  setText('fap-cell-picProvince', d.picProvince);

  setText('fap-cell-picPostalCode', d.picPostalCode);

  setText('fap-cell-establishmentActNo', d.establishmentActNo);

  setText('fap-cell-establishmentDate', d.establishmentDate);

  const hasExperience = Boolean(
    d.establishmentDate ||
      Number(d.experienceYears || 0) > 0 ||
      Number(d.experienceMonths || 0) > 0,
  );

  setText('fap-cell-experienceYears', hasExperience ? d.experienceYears : '');

  setText('fap-cell-experienceMonths', hasExperience ? d.experienceMonths : '');

  setText('fap-cell-latestDeedNo', d.latestDeedNo);

  setText('fap-cell-latestDeedDate', d.latestDeedDate);

  const deedRefNo = d.latestDeedNo || d.selectedDeedNo || '';

  const deedRefDate = d.latestDeedDate || '';

  const formattedDeedDate = deedRefDate.includes('-')
    ? deedRefDate.split('-').reverse().join('/')
    : deedRefDate;

  const deedRefText = `Berdasarkan Akta/ Based on Act No: ${deedRefNo || '.....'} Tanggal/Date: ${formattedDeedDate || '.....'}`;

  setText('fap-cell-shareholderDeedRef', deedRefText);

  setText('fap-cell-nib', d.nib);

  setText('fap-cell-npwp', d.npwp);

  setText('fap-cell-phoneFax', d.phoneFax);

  setText('fap-cell-website', d.website);

  setText('fap-cell-email', d.email);

  setText('fap-cell-repaymentSource', d.repaymentSource);
}
