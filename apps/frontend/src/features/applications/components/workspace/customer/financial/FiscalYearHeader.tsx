/** Header of the active fiscal year: year, previous / next and delete. */
import {Trash2} from 'lucide-react';

export function FiscalYearHeader({
  canFinance,
  currentIndex,
  r,
  removeFiscalYear,
  updateField,
  handleTriggerFieldSync,
}: {
  canFinance: boolean;
  currentIndex: number;
  r: any;
  removeFiscalYear: (index: number) => void;
  updateField: (index: number, key: string, value: any) => void;
  handleTriggerFieldSync: (field: string, section?: string, extra?: any) => void;
}) {
  return (
    <div
      className="repeat-top"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 12,
        marginBottom: 16,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'}}>
        <span style={{fontWeight: 700, color: '#1e3a8a', fontSize: '0.9rem'}}>
          Financial Statement / {String(currentIndex + 1).padStart(2, '0')}
        </span>
        <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
          <span style={{fontSize: '0.8rem', fontWeight: 600, color: '#475569'}}>Fiscal Year:</span>
          <input
            type="number"
            data-field="fiscalYear"
            className="input-field"
            style={{
              width: 85,
              padding: '4px 8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              textAlign: 'center',
            }}
            disabled={!canFinance}
            value={r.fiscalYear ?? ''}
            onChange={e => {
              updateField(currentIndex, 'fiscalYear', e.target.value);
              handleTriggerFieldSync('fiscalYear', 'fap-preview-sec-financial', {
                targetFinYear: currentIndex,
              });
            }}
            onFocus={() =>
              handleTriggerFieldSync('fiscalYear', 'fap-preview-sec-financial', {
                targetFinYear: currentIndex,
              })
            }
          />
        </div>
      </div>

      {canFinance && (
        <button
          type="button"
          className="icon-button danger"
          aria-label="Remove row"
          title="Delete this fiscal year"
          onClick={() => removeFiscalYear(currentIndex)}
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
