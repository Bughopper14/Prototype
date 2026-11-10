/** Global stylesheet of the CRM workspace. Injected only while the CRM shell is mounted (not on the portal pages), in this order. */
import base from '../styles/01-base.css?raw';
import brand from '../styles/02-brand.css?raw';
import fapSheet from '../styles/03-fap-sheet.css?raw';
import detailSplit from '../styles/04-detail-split.css?raw';
import documentStudio from '../styles/05-document-studio.css?raw';
import stakeholderModal from '../styles/06-stakeholder-modal.css?raw';
import stakeholderDetail from '../styles/07-stakeholder-detail.css?raw';
import responsive from '../styles/08-responsive.css?raw';
import fapComparison from '../styles/09-fap-comparison.css?raw';
import approvedExcel from '../styles/10-approved-excel.css?raw';
import shell from '../styles/11-shell.css?raw';
import keithSync from '../styles/12-keith-sync.css?raw';

const CRM_CSS = [
  base,
  brand,
  fapSheet,
  detailSplit,
  documentStudio,
  stakeholderModal,
  stakeholderDetail,
  responsive,
  fapComparison,
  approvedExcel,
  shell,
  keithSync,
].join('');

export function CrmStyles() {
  return <style data-crm dangerouslySetInnerHTML={{__html: CRM_CSS}} />;
}
