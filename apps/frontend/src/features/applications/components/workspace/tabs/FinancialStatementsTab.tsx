/** Tab: Financial statements. */
import {FinancialEditor} from '@/features/applications/components/FinancialEditor';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';

export function FinancialStatementsTab() {
  const {tab, draft, setDraft, canFinance} = useWorkspace();
  return (
    <>
      {tab === 4 && (
        <FinancialEditor
          rows={draft.financialStatements}
          disabled={!canFinance}
          onChange={financialStatements => setDraft({...draft, financialStatements})}
        />
      )}
    </>
  );
}
