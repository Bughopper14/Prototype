/** FAP form section "Identity": the sheet cells it highlights, where to scroll, and which cells belong to it. */
export const IDENTITY = {
  section: 'fap-preview-sec-header',
  /** Cells highlighted when the section is focused. */
  cellIds: [
    'fap-cell-applicationDate',
    'fap-cell-fapNumber',
    'fap-cell-custNew',
    'fap-cell-custExisting',
    'fap-cell-corporate',
    'fap-cell-commercial',
    'fap-cell-micro',
    'fap-cell-companyName',
    'fap-cell-nib',
    'fap-cell-npwp',
    'fap-cell-establishmentActNo',
    'fap-cell-establishmentDate',
    'fap-cell-sign-debtor-company',
  ],
  /** Cell the sheet scrolls to. */
  scrollTarget: 'fap-cell-fapNumber',
  /** Cells that, when clicked, open this section. */
  ownCellIds: [
    'fap-cell-applicationDate',
    'fap-cell-fapNumber',
    'fap-cell-custNew',
    'fap-cell-custExisting',
    'fap-cell-corporate',
    'fap-cell-commercial',
    'fap-cell-micro',
    'fap-cell-companyName',
    'fap-cell-nib',
    'fap-cell-npwp',
    'fap-cell-establishmentActNo',
    'fap-cell-establishmentDate',
    'fap-cell-sign-debtor-company',
  ],
};
