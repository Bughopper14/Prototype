/** Shown while no fiscal year has been added. */
import {Plus} from 'lucide-react';

export function EmptyStatements({
  canFinance,
  addFiscalYear,
}: {
  canFinance: boolean;
  addFiscalYear: () => void;
}) {
  return (
    <div
      className="empty-small"
      style={{
        padding: '24px',
        textAlign: 'center',
        background: '#f8fafc',
        borderRadius: 8,
        border: '1px dashed #cbd5e1',
      }}
    >
      <div style={{color: '#64748b', fontSize: '0.85rem', marginBottom: 8}}>
        Belum ada laporan keuangan / No financial statements yet.
      </div>
      {canFinance && (
        <button type="button" className="button small primary" onClick={addFiscalYear}>
          <Plus size={14} /> Add Fiscal Year (Maksimal 3)
        </button>
      )}
    </div>
  );
}
