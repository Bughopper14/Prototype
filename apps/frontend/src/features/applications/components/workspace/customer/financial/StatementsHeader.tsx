/** Title of section 09 and the add-fiscal-year button. */
import {Plus} from 'lucide-react';

export function StatementsHeader({
  canFinance,
  rows,
  maxRows,
  addFiscalYear,
}: {
  canFinance: boolean;
  rows: any[];
  maxRows: number;
  addFiscalYear: () => void;
}) {
  return (
    <div
      className="section-title"
      style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}
    >
      <div>
        <h3 style={{margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a'}}>
          Financial Statements
        </h3>
        <p
          className="muted repeater-description"
          style={{margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b'}}
        >
          Historical financial statements (Max. 3 fiscal years). All figures in IDR.
        </p>
      </div>
      {canFinance && rows.length < maxRows && (
        <button
          type="button"
          className="button small"
          onClick={addFiscalYear}
          style={{display: 'inline-flex', alignItems: 'center', gap: 6}}
        >
          <Plus size={15} /> Add fiscal year ({rows.length}/3)
        </button>
      )}
    </div>
  );
}
