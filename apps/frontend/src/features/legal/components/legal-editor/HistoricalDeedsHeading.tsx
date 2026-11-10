/** Heading of the previous deed history table. */
import {Clock} from 'lucide-react';

import {useLegalEditorContext} from '@/features/legal/components/legal-editor/LegalEditorContext';

export function HistoricalDeedsHeading() {
  const {historicalDeeds} = useLegalEditorContext();
  return (
    <div className="section-title legal-table-title" style={{marginTop: '34px'}}>
      <div>
        <div className="legal-list-heading">
          <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Clock size={17} style={{color: '#64748b'}} /> Previous Deed History (Historical Data)
          </h3>
          <span className="legal-count history-count">{historicalDeeds.length}</span>
        </div>
        <p className="muted">
          Chronological archive of previous amendment deeds and deeds that are no longer active / expired.
        </p>
      </div>
    </div>
  );
}
