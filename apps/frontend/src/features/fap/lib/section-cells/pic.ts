/** FAP form section "PIC": the sheet cells it highlights, where to scroll, and which cells belong to it. */
export const PIC = {
  section: 'fap-preview-sec-pic',
  /** Cells highlighted when the section is focused. */
  cellIds: [
    'fap-cell-picName',
    'fap-cell-phone',
    'fap-cell-position',
    'fap-cell-picEmail',
    'fap-cell-currentAddress',
    'fap-cell-picCity',
    'fap-cell-picProvince',
    'fap-cell-picPostalCode',
  ],
  /** Cell the sheet scrolls to. */
  scrollTarget: 'fap-cell-picName',
  /** Cells that, when clicked, open this section. */
  ownCellIds: [
    'fap-cell-picName',
    'fap-cell-phone',
    'fap-cell-position',
    'fap-cell-picEmail',
    'fap-cell-currentAddress',
    'fap-cell-picCity',
    'fap-cell-picProvince',
    'fap-cell-picPostalCode',
  ],
};
