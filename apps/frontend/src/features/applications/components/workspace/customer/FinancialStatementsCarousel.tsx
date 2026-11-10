/** Customer section 09: up to three fiscal years of financial statements, one year at a time. */
import {RatiosBar} from '@/features/applications/components/workspace/customer/financial/RatiosBar';
import {IncomeStatementFields} from '@/features/applications/components/workspace/customer/financial/IncomeStatementFields';
import {BalanceSheetFields} from '@/features/applications/components/workspace/customer/financial/BalanceSheetFields';
import {FiscalYearHeader} from '@/features/applications/components/workspace/customer/financial/FiscalYearHeader';
import {EmptyStatements} from '@/features/applications/components/workspace/customer/financial/EmptyStatements';
import {FiscalYearTabs} from '@/features/applications/components/workspace/customer/financial/FiscalYearTabs';
import {AuditedToggle} from '@/features/applications/components/workspace/customer/financial/AuditedToggle';
import {StatementsHeader} from '@/features/applications/components/workspace/customer/financial/StatementsHeader';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {useEffect} from 'react';
import {
  editStatementRow,
  MAX_FISCAL_YEARS,
  newFiscalYearRow,
  statementRatios,
} from '@/features/applications/lib/financial-statements';

export function FinancialStatementsCarousel() {
  const {draft, setDraft, canFinance, financialActiveIndex, setFinancialActiveIndex, handleTriggerFieldSync} =
    useWorkspace();
  const rows = draft.financialStatements || [];
  const maxRows = MAX_FISCAL_YEARS;
  const currentIndex = Math.min(financialActiveIndex, Math.max(rows.length - 1, 0));

  useEffect(() => {
    if (!draft.financialStatements || draft.financialStatements.length === 0) {
      const currentYear = new Date().getFullYear();
      const initialRows = [
        newFiscalYearRow([], currentYear - 2),
        newFiscalYearRow([], currentYear - 1),
        newFiscalYearRow([], currentYear),
      ];
      setDraft((prev: any) => ({
        ...prev,
        financialStatements: initialRows,
      }));
    }
  }, [draft.financialStatements]);

  const addFiscalYear = () => {
    if (rows.length >= maxRows) return;
    const nextRows = [...rows, newFiscalYearRow(rows)];
    setDraft({...draft, financialStatements: nextRows});
    setFinancialActiveIndex(nextRows.length - 1);
  };

  const removeFiscalYear = (index: number) => {
    const nextRows = rows.filter((_: any, j: number) => j !== index);
    setDraft({...draft, financialStatements: nextRows});
    setFinancialActiveIndex(Math.min(currentIndex, Math.max(nextRows.length - 1, 0)));
  };

  const updateField = (index: number, key: string, value: any) => {
    const updated = rows.map((r: any, j: number) => (j === index ? editStatementRow(r, key, value) : r));
    setDraft({...draft, financialStatements: updated});
  };

  const r = rows[currentIndex] || {};
  const {isBalanced, curRatio, debtEquity, netMargin} = statementRatios(r);

  return (
    <div className="financial-carousel-container">
      <StatementsHeader canFinance={canFinance} rows={rows} maxRows={maxRows} addFiscalYear={addFiscalYear} />

      {/* Global Audited Checkbox at top level outside 3 fiscal years */}
      <AuditedToggle
        draft={draft}
        setDraft={setDraft}
        canFinance={canFinance}
        handleTriggerFieldSync={handleTriggerFieldSync}
      />

      <FiscalYearTabs
        rows={rows}
        currentIndex={currentIndex}
        r={r}
        setFinancialActiveIndex={setFinancialActiveIndex}
      />

      {rows.length === 0 ? (
        <EmptyStatements canFinance={canFinance} addFiscalYear={addFiscalYear} />
      ) : (
        <div
          className="repeat"
          style={{background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px'}}
        >
          {/* Header of Active Year */}
          <FiscalYearHeader
            canFinance={canFinance}
            currentIndex={currentIndex}
            r={r}
            removeFiscalYear={removeFiscalYear}
            updateField={updateField}
            handleTriggerFieldSync={handleTriggerFieldSync}
          />

          {/* Inputs: 2-Column Responsive Grid (Neraca & Laba Rugi) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
              marginBottom: 20,
            }}
          >
            {/* Balance Sheet (Neraca) */}
            <BalanceSheetFields
              canFinance={canFinance}
              currentIndex={currentIndex}
              r={r}
              updateField={updateField}
              handleTriggerFieldSync={handleTriggerFieldSync}
            />

            {/* Income Statement (Laba Rugi) */}
            <IncomeStatementFields
              canFinance={canFinance}
              currentIndex={currentIndex}
              r={r}
              updateField={updateField}
              handleTriggerFieldSync={handleTriggerFieldSync}
            />
          </div>

          {/* Analysis & Ratios Bar (Gambar 2) */}
          <RatiosBar
            isBalanced={isBalanced}
            curRatio={curRatio}
            debtEquity={debtEquity}
            netMargin={netMargin}
          />
        </div>
      )}
    </div>
  );
}
