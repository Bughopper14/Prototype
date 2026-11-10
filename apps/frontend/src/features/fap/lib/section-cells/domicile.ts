/** FAP form section "Domicile": the sheet cells it highlights, where to scroll, and which cells belong to it. */
export const DOMICILE = {
  section: 'fap-preview-sec-company',
  /** Cells highlighted when the section is focused. */
  cellIds: [
    'fap-cell-branchCode',
    'fap-cell-liugongUser',
    'fap-cell-locationStatus',
    'fap-cell-companyAddress',
    'fap-cell-city',
    'fap-cell-province',
    'fap-cell-postalCode',
    'fap-cell-phoneFax',
    'fap-cell-website',
    'fap-cell-email',
  ],
  /** Cell the sheet scrolls to. */
  scrollTarget: 'fap-cell-companyAddress',
  /** Cells that, when clicked, open this section. */
  ownCellIds: [
    'fap-cell-branchCode',
    'fap-cell-liugongUser',
    'fap-cell-locationStatus',
    'fap-cell-companyAddress',
    'fap-cell-city',
    'fap-cell-province',
    'fap-cell-postalCode',
    'fap-cell-phoneFax',
    'fap-cell-website',
    'fap-cell-email',
  ],
};
