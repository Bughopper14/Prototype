/** Audited checkbox and the balance sheet / income statement, up to 3 fiscal years. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';

export function applyFinancialStatements({
  doc,
  d,
  setText,
}: {
  doc: Document;
  d: SheetValues;
  setText: CellWriters['setText'];
}) {
  // Financial Audited Checkbox
  const auditedCell = doc.getElementById('fap-cell-fin-audited');

  if (auditedCell) {
    if (d.financialAudited) {
      auditedCell.textContent = '✓';
      auditedCell.style.textAlign = 'center';
      auditedCell.style.fontWeight = 'bold';
      auditedCell.style.fontSize = '56pt';
      auditedCell.style.fontWeight = '900';
      auditedCell.style.lineHeight = '1';
      auditedCell.style.color = '#002060';
    } else {
      auditedCell.textContent = '';
    }
  }

  // Financial Statements (Balance Sheet & Income Statement) up to 3 fiscal years
  const finList = d.financialStatements || [];

  const fmtFinVal = (val: any) => {
    if (val === undefined || val === null || val === '') return '';
    const num = Number(val);
    return isNaN(num) ? String(val) : num.toLocaleString('id-ID');
  };

  for (let i = 0; i < 3; i++) {
    const item = finList[i];
    if (item) {
      const yr = item.fiscalYear ? String(item.fiscalYear) : '';
      setText(`fap-cell-fin-bs-yr-${i}`, yr || '20….');
      setText(`fap-cell-fin-is-yr-${i}`, yr || '20….');
      setText(`fap-cell-fin-cur-asset-${i}`, fmtFinVal(item.currentAssets));
      setText(`fap-cell-fin-noncur-asset-${i}`, fmtFinVal(item.nonCurrentAssets));
      setText(`fap-cell-fin-tot-asset-${i}`, fmtFinVal(item.totalAssets));
      setText(`fap-cell-fin-cur-liab-${i}`, fmtFinVal(item.currentLiabilities));
      setText(`fap-cell-fin-noncur-liab-${i}`, fmtFinVal(item.nonCurrentLiabilities));
      setText(`fap-cell-fin-tot-liab-${i}`, fmtFinVal(item.totalLiabilities));
      setText(`fap-cell-fin-equity-${i}`, fmtFinVal(item.equity));
      setText(`fap-cell-fin-tot-liab-equity-${i}`, fmtFinVal(item.totalLiabAndEquity));

      setText(`fap-cell-fin-revenue-${i}`, fmtFinVal(item.revenue));
      setText(`fap-cell-fin-gross-profit-${i}`, fmtFinVal(item.grossMargin ?? item.grossProfit));
      setText(`fap-cell-fin-op-profit-${i}`, fmtFinVal(item.operatingMargin ?? item.operatingProfit));
      setText(`fap-cell-fin-tax-${i}`, fmtFinVal(item.tax));
      setText(`fap-cell-fin-net-income-${i}`, fmtFinVal(item.netIncome));
    } else {
      setText(`fap-cell-fin-bs-yr-${i}`, '20….');
      setText(`fap-cell-fin-is-yr-${i}`, '20….');
      setText(`fap-cell-fin-cur-asset-${i}`, '');
      setText(`fap-cell-fin-noncur-asset-${i}`, '');
      setText(`fap-cell-fin-tot-asset-${i}`, '');
      setText(`fap-cell-fin-cur-liab-${i}`, '');
      setText(`fap-cell-fin-noncur-liab-${i}`, '');
      setText(`fap-cell-fin-tot-liab-${i}`, '');
      setText(`fap-cell-fin-equity-${i}`, '');
      setText(`fap-cell-fin-tot-liab-equity-${i}`, '');

      setText(`fap-cell-fin-revenue-${i}`, '');
      setText(`fap-cell-fin-gross-profit-${i}`, '');
      setText(`fap-cell-fin-op-profit-${i}`, '');
      setText(`fap-cell-fin-tax-${i}`, '');
      setText(`fap-cell-fin-net-income-${i}`, '');
    }
  }
}
