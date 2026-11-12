/** Financial statement persistence and derived KPIs on crm_fap_financial_statements. */
import {randomUUID} from 'node:crypto';
import type {PoolConnection} from 'mysql2/promise';
import {pool} from '../../core/db/pool';

type Db = Pick<PoolConnection, 'query' | 'execute'>;

export const num = (v: unknown) => {
  if (v === undefined || v === null || v === '') return 0;
  const parsed = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function initializeFinancialStatements() {
  await pool.query('SELECT 1 FROM crm_fap_financial_statements LIMIT 1');
}

export async function readFinancialStatements(applicationId: string, db: Db = pool) {
  const [rows] = await db.query<any[]>(
    `SELECT * FROM crm_fap_financial_statements
     WHERE application_id = ? AND deleted_at IS NULL AND is_active = 1
     ORDER BY fiscal_year ASC`,
    [applicationId],
  );
  return rows.map(r => ({
    id: r.id,
    fiscalYear: Number(r.fiscal_year),
    isAudited: Boolean(r.is_audited),
    currentAssets: Number(r.current_assets),
    nonCurrentAssets: Number(r.non_current_assets),
    totalAssets: Number(r.total_assets),
    currentLiabilities: Number(r.current_liabilities),
    nonCurrentLiabilities: Number(r.non_current_liabilities),
    totalLiabilities: Number(r.total_liabilities),
    equity: Number(r.equity),
    totalLiabAndEquity: Number(r.total_liabilities_and_equity),
    revenue: Number(r.revenue),
    grossMargin: Number(r.gross_profit),
    operatingMargin: Number(r.operating_profit_ebit),
    tax: Number(r.tax),
    netIncome: Number(r.net_income),
    isBalanced: Boolean(r.is_balanced),
    currentRatio: r.current_ratio !== null ? Number(r.current_ratio) : null,
    debtToEquityRatio: r.debt_to_equity_ratio !== null ? Number(r.debt_to_equity_ratio) : null,
    netProfitMarginPct: r.net_profit_margin_pct !== null ? Number(r.net_profit_margin_pct) : null,
  }));
}

export async function saveFinancialStatements(
  applicationId: string,
  statements: any[],
  isAudited = false,
  actorName = 'System',
  conn?: Db,
) {
  const run = async (db: Db) => {
    await db.execute(
      `UPDATE crm_fap_financial_statements
       SET is_active = NULL, deleted_at = CURRENT_TIMESTAMP(3), updated_by = ?
       WHERE application_id = ? AND is_active = 1`,
      [actorName, applicationId],
    );

    const seenYears = new Set<number>();
    for (const s of statements || []) {
      const fiscalYear = Math.trunc(Number(s?.fiscalYear));
      if (!Number.isFinite(fiscalYear) || fiscalYear < 1900 || seenYears.has(fiscalYear)) continue;
      seenYears.add(fiscalYear);

      const currentAssets = num(s.currentAssets);
      const nonCurrentAssets = num(s.nonCurrentAssets);
      const totalAssets = currentAssets + nonCurrentAssets;
      const currentLiabilities = num(s.currentLiabilities);
      const nonCurrentLiabilities = num(s.nonCurrentLiabilities);
      const totalLiabilities = currentLiabilities + nonCurrentLiabilities;
      const equity = num(s.equity);
      const totalLiabAndEquity = totalLiabilities + equity;
      const revenue = num(s.revenue);
      const grossProfit = num(s.grossMargin ?? s.grossProfit);
      const operatingProfit = num(s.operatingMargin ?? s.operatingProfitEbit);
      const tax = num(s.tax);
      const netIncome = num(s.netIncome);

      const isBalanced = Math.abs(totalAssets - totalLiabAndEquity) < 0.01 ? 1 : 0;
      const currentRatio = currentLiabilities > 0 ? Number((currentAssets / currentLiabilities).toFixed(6)) : null;
      const debtToEquityRatio = equity !== 0 ? Number((totalLiabilities / equity).toFixed(6)) : null;
      const netProfitMarginPct = revenue !== 0 ? Number(((netIncome / revenue) * 100).toFixed(6)) : null;
      const rowAudited = s.isAudited !== undefined ? (s.isAudited ? 1 : 0) : isAudited ? 1 : 0;

      await db.execute(
        `INSERT INTO crm_fap_financial_statements (
          id, application_id, fiscal_year, is_audited,
          current_assets, non_current_assets, total_assets,
          current_liabilities, non_current_liabilities, total_liabilities,
          equity, total_liabilities_and_equity,
          revenue, gross_profit, operating_profit_ebit, tax, net_income,
          is_balanced, current_ratio, debt_to_equity_ratio, net_profit_margin_pct,
          is_active, created_by, updated_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
        [
          randomUUID(),
          applicationId,
          fiscalYear,
          rowAudited,
          currentAssets,
          nonCurrentAssets,
          totalAssets,
          currentLiabilities,
          nonCurrentLiabilities,
          totalLiabilities,
          equity,
          totalLiabAndEquity,
          revenue,
          grossProfit,
          operatingProfit,
          tax,
          netIncome,
          isBalanced,
          currentRatio,
          debtToEquityRatio,
          netProfitMarginPct,
          actorName,
          actorName,
        ],
      );
    }

    await db.execute(
      `UPDATE crm_fap_application_profiles
       SET is_financial_audited = ?, updated_at = CURRENT_TIMESTAMP(3), updated_by = ?
       WHERE application_id = ?`,
      [isAudited ? 1 : 0, actorName, applicationId],
    );
  };

  if (conn) return run(conn);
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    await run(c);
    await c.commit();
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
