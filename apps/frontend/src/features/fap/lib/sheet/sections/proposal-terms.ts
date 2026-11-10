/** Facility proposed (with the currency strike-through) and the three Terms & Conditions boxes. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';

export function applyProposalAndTerms({
  doc,
  d,
  setText,
}: {
  doc: Document;
  d: SheetValues;
  setText: CellWriters['setText'];
}) {
  // Financing Proposal & Terms and Conditions
  const prop = d.financingProposal || {};

  const facProp = prop.facilityProposed || {};

  const tcFl = prop.termsFinancialLease || {};

  const tcSlb = prop.termsSaleAndLeaseBack || {};

  const tcIf = prop.termsInstallmentFinancing || {};

  setText('fap-cell-prop-method', facProp.financingMethod);

  setText('fap-cell-prop-app-source', facProp.applicationSource);

  setText('fap-cell-prop-val', facProp.financingValue);

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

  setBoxText('fap-cell-tc-fl-purpose', tcFl.workingCapitalInvestment || tcFl.investment, 'Investment');

  setBoxText('fap-cell-tc-fl-curr', tcFl.currency);

  setBoxText('fap-cell-tc-fl-deposit', tcFl.securityDeposit);

  setBoxText('fap-cell-tc-fl-rate', tcFl.interestRate);

  setBoxText('fap-cell-tc-fl-tenor', tcFl.tenor);

  setBoxText('fap-cell-tc-fl-payment', tcFl.paymentMethod);

  setBoxText('fap-cell-tc-slb-purpose', tcSlb.workingCapitalInvestment);

  setBoxText('fap-cell-tc-slb-curr', tcSlb.currency);

  setBoxText('fap-cell-tc-slb-deposit', tcSlb.securityDeposit);

  setBoxText('fap-cell-tc-slb-rate', tcSlb.interestRate);

  setBoxText('fap-cell-tc-slb-tenor', tcSlb.tenor);

  setBoxText('fap-cell-tc-slb-payment', tcSlb.paymentMethod);

  setBoxText('fap-cell-tc-if-purpose', tcIf.workingCapitalInvestment);

  setBoxText('fap-cell-tc-if-curr', tcIf.currency);

  setBoxText('fap-cell-tc-if-dp', tcIf.downPayment);

  setBoxText('fap-cell-tc-if-rate', tcIf.interestRate);

  setBoxText('fap-cell-tc-if-tenor', tcIf.tenor);

  setBoxText('fap-cell-tc-if-payment', tcIf.paymentMethod);
}
