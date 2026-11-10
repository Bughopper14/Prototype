/** Tabs to switch between the fiscal years. */
import {ChevronLeft, ChevronRight} from 'lucide-react';
import type {Dispatch, SetStateAction} from 'react';

export function FiscalYearTabs({
  rows,
  currentIndex,
  r,
  setFinancialActiveIndex,
}: {
  rows: any[];
  currentIndex: number;
  r: any;
  setFinancialActiveIndex: Dispatch<SetStateAction<number>>;
}) {
  return (
    <>
      {rows.length > 0 && (
        <div className="repeater-carousel-controls" style={{marginBottom: 14}}>
          <button
            type="button"
            className="button small"
            disabled={currentIndex === 0}
            onClick={() => setFinancialActiveIndex(i => Math.max(i - 1, 0))}
          >
            <ChevronLeft size={15} /> Previous
          </button>
          <span style={{fontWeight: 600, color: '#1e293b'}}>
            {currentIndex + 1} of {rows.length} {r.fiscalYear ? `· Fiscal Year ${r.fiscalYear}` : ''}
          </span>
          <button
            type="button"
            className="button small"
            disabled={currentIndex >= rows.length - 1}
            onClick={() => setFinancialActiveIndex(i => Math.min(i + 1, rows.length - 1))}
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}
    </>
  );
}
