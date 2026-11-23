/** Facility proposed (with the currency strike-through) and the three Terms & Conditions boxes. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';
import {resolveFinancingMethodGroup, type MasterCatalog} from '@liugong/shared';

export function applyProposalAndTerms({
  doc,
  d,
  setText,
  master,
}: {
  doc: Document;
  d: SheetValues;
  setText: CellWriters['setText'];
  master: MasterCatalog;
}) {
  // Payment timing is stored as its master code (IN-ARREAR / IN-ADVANCE); the sheet prints its name.
  const paymentName = (code: any) => (master.paymentMethod || []).find(x => x.value === code)?.name || code;
  // Financing Proposal & Terms and Conditions
  const prop = d.financingProposal || {};

  const facProp = prop.facilityProposed || {};

  const tcFl = prop.termsFinancialLease || {};

  const tcSlb = prop.termsSaleAndLeaseBack || {};

  const tcIf = prop.termsInstallmentFinancing || {};

  setText('fap-cell-prop-method', facProp.financingMethod);

  setText('fap-cell-prop-app-source', facProp.applicationSource);

  const rawFinVal = facProp.financingValue;
  const isFinValEmpty =
    rawFinVal === undefined ||
    rawFinVal === null ||
    String(rawFinVal).trim() === '' ||
    String(rawFinVal).trim() === '0' ||
    Number(rawFinVal) === 0;
  setText('fap-cell-prop-val', isFinValEmpty ? '' : rawFinVal);

  // Currency selector with double strikethrough for unselected currency
  const currCell = doc.getElementById('fap-cell-prop-curr-choice');

  if (currCell) {
    const choice = String(facProp.currencyChoice || '')
      .toUpperCase()
      .trim();
    if (choice === 'USD') {
      currCell.innerHTML = `: (<span style="text-decoration:line-through;text-decoration-style:double;">IDR</span> / USD)`;
    } else if (choice === 'IDR') {
      currCell.innerHTML = `: (IDR / <span style="text-decoration:line-through;text-decoration-style:double;">USD</span>)`;
    } else {
      currCell.innerHTML = `: (IDR / USD)`;
    }
  }

  const setBoxText = (id: string, text: any, defaultLabel = '') => {
    const el = doc.getElementById(id);
    if (el) {
      const valStr = text !== undefined && text !== null ? String(text).trim() : '';
      if (valStr) {
        el.textContent = valStr;
        el.style.textAlign = 'center';
        el.style.fontWeight = 'bold';
        el.style.color = '#002060';
        if (valStr.length > 5) {
          el.style.fontSize = '14pt';
        } else {
          el.style.fontSize = '20pt';
        }
      } else {
        el.textContent = defaultLabel;
        el.style.textAlign = '';
        el.style.fontWeight = '';
        el.style.color = '';
      }
    }
  };

  const selectedGroup = resolveFinancingMethodGroup(facProp.financingMethod);
  const isFl = selectedGroup === 'termsFinancialLease';
  const isSlb = selectedGroup === 'termsSaleAndLeaseBack';
  const isIf = selectedGroup === 'termsInstallmentFinancing';

  setBoxText('fap-cell-tc-fl-purpose', isFl ? tcFl.workingCapitalInvestment : '');
  setBoxText('fap-cell-tc-fl-curr', isFl ? tcFl.currency : '');
  setBoxText('fap-cell-tc-fl-deposit', isFl ? tcFl.securityDeposit : '');
  setBoxText('fap-cell-tc-fl-rate', isFl ? tcFl.interestRate : '');
  setBoxText('fap-cell-tc-fl-tenor', isFl ? tcFl.tenor : '');
  setBoxText('fap-cell-tc-fl-payment', isFl ? paymentName(tcFl.paymentMethod) : '');

  setBoxText('fap-cell-tc-slb-purpose', isSlb ? tcSlb.workingCapitalInvestment : '');
  setBoxText('fap-cell-tc-slb-curr', isSlb ? tcSlb.currency : '');
  setBoxText('fap-cell-tc-slb-deposit', isSlb ? tcSlb.securityDeposit : '');
  setBoxText('fap-cell-tc-slb-rate', isSlb ? tcSlb.interestRate : '');
  setBoxText('fap-cell-tc-slb-tenor', isSlb ? tcSlb.tenor : '');
  setBoxText('fap-cell-tc-slb-payment', isSlb ? paymentName(tcSlb.paymentMethod) : '');

  setBoxText('fap-cell-tc-if-purpose', isIf ? tcIf.workingCapitalInvestment : '');
  setBoxText('fap-cell-tc-if-curr', isIf ? tcIf.currency : '');
  setBoxText('fap-cell-tc-if-dp', isIf ? tcIf.downPayment : '');
  setBoxText('fap-cell-tc-if-rate', isIf ? tcIf.interestRate : '');
  setBoxText('fap-cell-tc-if-tenor', isIf ? tcIf.tenor : '');
  setBoxText('fap-cell-tc-if-payment', isIf ? paymentName(tcIf.paymentMethod) : '');
}
