/** Mandatory-field rules of the FAP form: Financial Statements. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const FAP_FINANCIAL_STATEMENTS_RULES = defineRules('FAP', 'Financial Statements', [
  [142, 'financialAudited', 'Audited Financial Statements (Global Check)', 0],
  [143, 'fiscalYear', 'Fiscal Year', 0],
  [144, 'currentAssets', 'Balance Sheet - Current Assets', 0],
  [145, 'nonCurrentAssets', 'Balance Sheet - Non-Current Assets', 0],
  [146, 'totalAssets', 'Balance Sheet - Total Assets', 0],
  [147, 'currentLiabilities', 'Balance Sheet - Current Liabilities', 0],
  [148, 'nonCurrentLiabilities', 'Balance Sheet - Non-Current Liabilities', 0],
  [149, 'totalLiabilities', 'Balance Sheet - Total Liabilities', 0],
  [150, 'equity', 'Balance Sheet - Equity', 0],
  [151, 'totalLiabAndEquity', 'Balance Sheet - Total Liabilities & Equity', 0],
  [152, 'revenue', 'Income Statement - Revenue', 0],
  [153, 'grossMargin', 'Income Statement - Gross Profit', 0],
  [154, 'operatingMargin', 'Income Statement - Operating Profit (EBIT)', 0],
  [155, 'tax', 'Income Statement - Tax', 0],
  [156, 'netIncome', 'Income Statement - Net Income', 0],
]);
