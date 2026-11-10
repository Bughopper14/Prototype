/** Heading and add button of the active deeds table. */
import {CheckCircle, Plus} from 'lucide-react';

import {useLegalEditorContext} from '@/features/legal/components/legal-editor/LegalEditorContext';

export function ActiveDeedsHeading() {
  const {application, disabled, openAdd, activeDeeds} = useLegalEditorContext();
  return (
    <div className="section-title legal-table-title">
      <div>
        <div className="legal-list-heading">
          <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <CheckCircle size={17} style={{color: '#2563eb'}} /> Active Deeds &amp; Current Reference
          </h3>
          <span className="legal-count active-count">{activeDeeds.length}</span>
        </div>
        <p className="muted">
          Showing 1 primary establishment deed and 1 latest effective amendment deed as the current legal
          reference.
        </p>
      </div>
      {!disabled && ['DRAFT', 'RETURNED'].includes(application.status) && (
        <div className="legal-table-actions">
          <button className="button small" onClick={openAdd}>
            <Plus size={15} />
            Add Deed
          </button>
        </div>
      )}
    </div>
  );
}
