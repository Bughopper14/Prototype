/** Pure helpers of the financial statements section (FAP 09): new year, auto-sums and ratios. */
import {blank, financialFields} from '@liugong/shared';

export const MAX_FISCAL_YEARS = 3;

/** A blank statement for the year after the latest one (or last year when there is none). */
export function newFiscalYearRow(rows: any[], forcedYear?: number) {
  if (forcedYear !== undefined) {
    return {
      ...blank(financialFields),
      fiscalYear: forcedYear,
      isAudited: false,
    };
  }
  const existingYears = rows.map((r: any) => Number(r.fiscalYear) || 0).filter((y: number) => y > 0);
  const currentYear = new Date().getFullYear();
  const newYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : currentYear;
  return {
    ...blank(financialFields),
    fiscalYear: newYear,
    isAudited: false,
  };
}

/** One edited value, with the totals that depend on it recalculated. */
export function editStatementRow(r: any, key: string, value: any) {
  const newRow = {...r, [key]: value};
  // Auto-sum totals if component fields are edited
  if (key === 'currentAssets' || key === 'nonCurrentAssets') {
    newRow.totalAssets = (Number(newRow.currentAssets) || 0) + (Number(newRow.nonCurrentAssets) || 0);
  }
  if (key === 'currentLiabilities' || key === 'nonCurrentLiabilities') {
    newRow.totalLiabilities =
      (Number(newRow.currentLiabilities) || 0) + (Number(newRow.nonCurrentLiabilities) || 0);
    newRow.totalLiabAndEquity = (Number(newRow.totalLiabilities) || 0) + (Number(newRow.equity) || 0);
  }
  if (key === 'equity') {
    newRow.totalLiabAndEquity = (Number(newRow.totalLiabilities) || 0) + (Number(newRow.equity) || 0);
  }
  return newRow;
}

/** Balance check and the key ratios of one statement. */
export function statementRatios(r: any) {
  const curA = Number(r.currentAssets) || 0;
  const nonCurA = Number(r.nonCurrentAssets) || 0;
  const totA = Number(r.totalAssets) || 0;
  const curL = Number(r.currentLiabilities) || 0;
  const nonCurL = Number(r.nonCurrentLiabilities) || 0;
  const totL = Number(r.totalLiabilities) || 0;
  const eq = Number(r.equity) || 0;
  const totLE = Number(r.totalLiabAndEquity) || 0;
  const rev = Number(r.revenue) || 0;
  const netInc = Number(r.netIncome) || 0;

  const isBalanced =
    curA + nonCurA === totA && curL + nonCurL === totL && totA === totL + eq && totA === totLE;
  const curRatio = curL > 0 ? (curA / curL).toFixed(2) : 'N/A';
  const debtEquity = eq > 0 ? (totL / eq).toFixed(2) : 'N/A';
  const netMargin = rev > 0 ? ((netInc / rev) * 100).toFixed(2) + '%' : 'N/A';
  return {isBalanced, curRatio, debtEquity, netMargin};
}
