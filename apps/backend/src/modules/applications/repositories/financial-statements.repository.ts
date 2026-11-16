import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {z} from 'zod';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';
import {money, ratios} from '../../../core/domain';

type Conn = Pick<PoolConnection, 'query' | 'execute'>;

/** API field → column of crm_fap_financial_statements. */
const METRICS = {
  currentAssets: 'current_assets',
  nonCurrentAssets: 'non_current_assets',
  totalAssets: 'total_assets',
  currentLiabilities: 'current_liabilities',
  nonCurrentLiabilities: 'non_current_liabilities',
  totalLiabilities: 'total_liabilities',
  equity: 'equity',
  totalLiabAndEquity: 'total_liabilities_and_equity',
  revenue: 'revenue',
  grossMargin: 'gross_profit',
  operatingMargin: 'operating_profit_ebit',
  tax: 'tax',
  netIncome: 'net_income',
} as const;

/** FAP section 09: up to three fiscal years of financial statements with their ratios. */
@Injectable()
export class FinancialStatementsRepository {
  constructor(private readonly db: CrmDatabase) {}

  async read(applicationId: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${CRM.fapFinancialStatements} WHERE application_id=? AND is_active=1 ORDER BY fiscal_year`,
      [applicationId],
    );
    const financialStatements = rows.map(row => ({
      id: row.id,
      fiscalYear: row.fiscal_year,
      isAudited: !!row.is_audited,
      ...Object.fromEntries(Object.entries(METRICS).map(([key, column]) => [key, row[column]])),
    }));
    return {
      financialStatements,
      ratios: financialStatements.map(row => ({fiscalYear: row.fiscalYear, ...ratios(row)})),
    };
  }

  /** Replaces the statements: years not sent are soft-deleted (deleted_at set, is_active NULL as the design asks). */
  async save(conn: Conn, applicationId: string, input: unknown, by: string | null) {
    const amount = z.union([z.string().regex(/^-?\d{1,18}(\.\d{1,2})?$/), z.number().finite()]).transform(String);
    const rows = z
      .array(
        z.object({
          fiscalYear: z.number().int().min(1900).max(new Date().getFullYear()),
          isAudited: z.boolean(),
          ...Object.fromEntries(Object.keys(METRICS).map(key => [key, amount])),
        }),
      )
      .max(3)
      .parse(input);
    const years = rows.map(r => r.fiscalYear);
    if (new Set(years).size !== years.length)
      throw Object.assign(new Error('Fiscal years must be unique'), {status: 422});
    await conn.execute(
      `UPDATE ${CRM.fapFinancialStatements} SET deleted_at=CURRENT_TIMESTAMP(3),is_active=NULL,updated_by=?
       WHERE application_id=? AND is_active=1 ${years.length ? `AND fiscal_year NOT IN (${years.map(() => '?').join(',')})` : ''}`,
      [by, applicationId, ...years],
    );
    for (const row of rows as any[]) {
      const ratio = ratios(row);
      const assets = money(row.currentAssets).plus(row.nonCurrentAssets);
      const liabilitiesAndEquity = money(row.currentLiabilities).plus(row.nonCurrentLiabilities).plus(row.equity);
      const values: Record<string, any> = {
        is_audited: row.isAudited ? 1 : 0,
        ...Object.fromEntries(Object.entries(METRICS).map(([key, column]) => [column, row[key]])),
        is_balanced: assets.eq(liabilitiesAndEquity) ? 1 : 0,
        current_ratio: ratio.currentRatio,
        debt_to_equity_ratio: ratio.debtToEquity,
        net_profit_margin_pct: ratio.netProfitMargin,
      };
      const [old] = await conn.execute<any[]>(
        `SELECT id FROM ${CRM.fapFinancialStatements} WHERE application_id=? AND fiscal_year=? AND is_active=1 FOR UPDATE`,
        [applicationId, row.fiscalYear],
      );
      const cols = Object.keys(values);
      if (old.length)
        await conn.execute(
          `UPDATE ${CRM.fapFinancialStatements} SET ${cols.map(c => `${c}=?`).join(',')},updated_by=? WHERE id=?`,
          [...Object.values(values), by, old[0].id],
        );
      else
        await conn.execute(
          `INSERT INTO ${CRM.fapFinancialStatements} (id,application_id,fiscal_year,is_active,${cols.join(',')},created_by)
           VALUES (?,?,?,1,${cols.map(() => '?').join(',')},?)`,
          [crypto.randomUUID(), applicationId, row.fiscalYear, ...Object.values(values), by],
        );
    }
  }
}
