/** Industry segmentation, business role checkboxes and the legal / contact cells of the customer. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';

export function applyCustomerProfile({d, setText}: {d: SheetValues; setText: CellWriters['setText']}) {
  // Industry Segmentation Checkboxes (strictly empty if not selected)
  const segUpper = String(d.industrySegment || '')
    .trim()
    .toUpperCase();

  setText(
    'fap-cell-seg-mining',
    !segUpper ? '' : segUpper === 'MINING' || segUpper.includes('TAMBANG') ? '✓' : '',
  );

  setText(
    'fap-cell-seg-agriculture',
    !segUpper
      ? ''
      : segUpper === 'AGRICULTURE' || segUpper.includes('TANI') || segUpper.includes('AGRI')
        ? '✓'
        : '',
  );

  setText(
    'fap-cell-seg-forestry',
    !segUpper ? '' : segUpper === 'FORESTRY' || segUpper.includes('HUTAN') ? '✓' : '',
  );

  setText(
    'fap-cell-seg-construction',
    !segUpper ? '' : segUpper === 'CONSTRUCTION' || segUpper.includes('KONSTRUKSI') ? '✓' : '',
  );

  setText(
    'fap-cell-seg-oilgas',
    !segUpper
      ? ''
      : segUpper === 'OIL_AND_GAS' || segUpper.includes('OIL') || segUpper.includes('GAS')
        ? '✓'
        : '',
  );

  setText(
    'fap-cell-seg-other',
    !segUpper ? '' : segUpper === 'OTHER' || segUpper.includes('LAIN') ? '✓' : '',
  );

  // Main Business / Business Role Checkboxes (strictly empty if not selected)
  const roleUpper = String(d.businessRole || '')
    .trim()
    .toUpperCase();

  setText(
    'fap-cell-role-consowner',
    !roleUpper
      ? ''
      : roleUpper === 'CONS_OWNER' || roleUpper.includes('CONS') || roleUpper.includes('OWNER')
        ? '✓'
        : '',
  );

  setText(
    'fap-cell-role-contractors',
    !roleUpper
      ? ''
      : roleUpper === 'CONTRACTORS' || roleUpper === 'CONTRACTOR' || roleUpper.includes('KONTRAKTOR')
        ? '✓'
        : '',
  );

  setText(
    'fap-cell-role-subcont',
    !roleUpper
      ? ''
      : roleUpper === 'SUB_CONT' || roleUpper === 'SUB CONT' || roleUpper.startsWith('SUB')
        ? '✓'
        : '',
  );

  setText(
    'fap-cell-role-rental',
    !roleUpper ? '' : roleUpper === 'RENTAL' || roleUpper.includes('SEWA') ? '✓' : '',
  );

  setText(
    'fap-cell-role-other',
    !roleUpper ? '' : roleUpper === 'OTHER' || roleUpper.includes('LAIN') ? '✓' : '',
  );

  setText('fap-cell-picProvince', d.picProvince);

  setText('fap-cell-picPostalCode', d.picPostalCode);

  setText('fap-cell-establishmentActNo', d.establishmentActNo);

  setText('fap-cell-establishmentDate', d.establishmentDate);

  setText('fap-cell-experienceYears', d.experienceYears);

  setText('fap-cell-experienceMonths', d.experienceMonths);

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
