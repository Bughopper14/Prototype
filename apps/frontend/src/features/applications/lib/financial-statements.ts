/** Pure helpers of the financial statements section (FAP 09): new year, auto-sums and ratios. */

export const MAX_FISCAL_YEARS = 3;

/** The three years a statement starts with: the last three finished years, oldest first (2023, 2024, 2025 in 2026). The user can change them. */
export function defaultFiscalYears(now = new Date().getFullYear()): number[] {
  return [now - 3, now - 2, now - 1];
}

/** The year a new statement gets: the newest of the default years that is not used yet, else the year after the latest one. */
export function nextFiscalYear(rows: any[]): number {
  const used = new Set(rows.map((r: any) => Number(r.fiscalYear) || 0).filter((y: number) => y > 0));
  const free = [...defaultFiscalYears()].reverse().find(y => !used.has(y));
  return free ?? Math.max(...used) + 1;
}

/** The statements in the order the database and the FAP sheet keep them: oldest year first. */
export function byFiscalYear<T extends {fiscalYear?: unknown}>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (Number(a.fiscalYear) || 0) - (Number(b.fiscalYear) || 0));
}

/** A blank statement for a year (by default the next free one of the last three years). */
export function newFiscalYearRow(rows: any[], forcedYear?: number) {
  const year = forcedYear ?? nextFiscalYear(rows);
  return {
    fiscalYear: year,
    isAudited: false,
    currentAssets: '',
    nonCurrentAssets: '',
    totalAssets: '',
    currentLiabilities: '',
    nonCurrentLiabilities: '',
    totalLiabilities: '',
    equity: '',
    totalLiabAndEquity: '',
    revenue: '',
    grossMargin: '',
    operatingMargin: '',
    tax: '',
    netIncome: '',
  };
}

/** One edited value, with the totals that depend on it recalculated. */
export function editStatementRow(r: any, key: string, value: any) {
  const newRow = {...r, [key]: value};
  // Auto-sum totals if component fields are edited
  if (key === 'currentAssets' || key === 'nonCurrentAssets') {
    const hasCur = newRow.currentAssets !== '' && newRow.currentAssets !== undefined && newRow.currentAssets !== null;
    const hasNonCur = newRow.nonCurrentAssets !== '' && newRow.nonCurrentAssets !== undefined && newRow.nonCurrentAssets !== null;
    if (!hasCur && !hasNonCur) {
      newRow.totalAssets = '';
    } else {
      newRow.totalAssets = (Number(newRow.currentAssets) || 0) + (Number(newRow.nonCurrentAssets) || 0);
    }
  }
  if (key === 'currentLiabilities' || key === 'nonCurrentLiabilities') {
    const hasCur = newRow.currentLiabilities !== '' && newRow.currentLiabilities !== undefined && newRow.currentLiabilities !== null;
    const hasNonCur = newRow.nonCurrentLiabilities !== '' && newRow.nonCurrentLiabilities !== undefined && newRow.nonCurrentLiabilities !== null;
    if (!hasCur && !hasNonCur) {
      newRow.totalLiabilities = '';
    } else {
      newRow.totalLiabilities = (Number(newRow.currentLiabilities) || 0) + (Number(newRow.nonCurrentLiabilities) || 0);
    }
    const hasTotL = newRow.totalLiabilities !== '' && newRow.totalLiabilities !== undefined && newRow.totalLiabilities !== null;
    const hasEq = newRow.equity !== '' && newRow.equity !== undefined && newRow.equity !== null;
    if (!hasTotL && !hasEq) {
      newRow.totalLiabAndEquity = '';
    } else {
      newRow.totalLiabAndEquity = (Number(newRow.totalLiabilities) || 0) + (Number(newRow.equity) || 0);
    }
  }
  if (key === 'equity') {
    const hasTotL = newRow.totalLiabilities !== '' && newRow.totalLiabilities !== undefined && newRow.totalLiabilities !== null;
    const hasEq = newRow.equity !== '' && newRow.equity !== undefined && newRow.equity !== null;
    if (!hasTotL && !hasEq) {
      newRow.totalLiabAndEquity = '';
    } else {
      newRow.totalLiabAndEquity = (Number(newRow.totalLiabilities) || 0) + (Number(newRow.equity) || 0);
    }
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
