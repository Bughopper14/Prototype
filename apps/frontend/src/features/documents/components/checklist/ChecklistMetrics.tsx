/** The four metric cards above the checklist. */
import {CheckCircle2, Clock, ShieldCheck, Layers, ChevronRight, X, AlertCircle} from 'lucide-react';
import {useState} from 'react';

function Progress({value}: {value: number}) {
  return (
    <div className="bento-progress" aria-hidden="true">
      <span style={{width: `${Math.min(100, Math.max(0, value))}%`}} />
    </div>
  );
}

export function ChecklistMetrics({
  stats,
}: {
  stats: ReturnType<typeof import('@/features/documents/lib/checklist/summarize').summarizeRows>;
}) {
  const [missingModalType, setMissingModalType] = useState<'all' | 'mandatory' | null>(null);

  const availablePct = Math.round((stats.availableCount / (stats.totalCount || 1)) * 100);
  const mandatoryPct = Math.round((stats.mandatoryAvailableCount / (stats.mandatoryCount || 1)) * 100);
  const mandatoryLeft = stats.mandatoryCount - stats.mandatoryAvailableCount;
  
  const allPending = [
    ...stats.missingMandatory.map((name: string) => ({name, mandatory: true})),
    ...stats.missingOptional.map((name: string) => ({name, mandatory: false})),
  ];
  const mandatoryPending = stats.missingMandatory.map((name: string) => ({name, mandatory: true}));

  const activeModalList = missingModalType === 'mandatory' ? mandatoryPending : allPending;
  const activeModalTitle = missingModalType === 'mandatory' 
    ? `Missing Mandatory Documents (${mandatoryPending.length})` 
    : `Missing Documents (${allPending.length})`;

  return (
    <>
      <div className="doc-checklist-bento-grid">
        {/* Total Documents */}
        <div className="doc-checklist-bento-card card-total">
          <div className="bento-top">
            <span className="bento-lbl">Total Documents</span>
            <Layers size={18} className="bento-icon" />
          </div>
          <div className="bento-val">{stats.totalCount}</div>
          <div className="bento-bottom">
            <small className="bento-sub">Standard legal &amp; credit matrix</small>
          </div>
        </div>

        {/* Fulfilled */}
        <div className="doc-checklist-bento-card card-available">
          <div className="bento-top">
            <span className="bento-lbl">Fulfilled</span>
            <CheckCircle2 size={18} className="bento-icon" />
          </div>
          <div className="bento-val">
            {stats.availableCount} <span className="bento-total-ratio">/ {stats.totalCount}</span>
          </div>
          <div className="bento-bottom">
            <Progress value={availablePct} />
            <small className="bento-sub text-green">{availablePct}% complete</small>
          </div>
        </div>

        {/* Missing Documents */}
        <div 
          className={`doc-checklist-bento-card card-pending ${stats.pendingCount > 0 ? 'is-clickable' : ''}`}
          onClick={stats.pendingCount > 0 ? () => setMissingModalType('all') : undefined}
          title={stats.pendingCount > 0 ? 'Click to view missing documents' : undefined}
          role={stats.pendingCount > 0 ? 'button' : undefined}
          tabIndex={stats.pendingCount > 0 ? 0 : undefined}
          onKeyDown={e => {
            if (stats.pendingCount > 0 && (e.key === 'Enter' || e.key === ' ')) {
              setMissingModalType('all');
            }
          }}
        >
          <div className="bento-top">
            <span className="bento-lbl">Missing</span>
            <Clock size={18} className="bento-icon" />
          </div>
          <div className="bento-val">{stats.pendingCount}</div>
          <div className="bento-bottom">
            <div className="bento-footer-row">
              <small className="bento-sub">
                {stats.pendingCount > 0 ? 'Requires upload or follow-up' : 'All documents fulfilled'}
              </small>
              {stats.pendingCount > 0 && (
                <span className="bento-click-indicator">
                  View <ChevronRight size={13} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mandatory Documents */}
        <div 
          className={`doc-checklist-bento-card card-mandatory ${mandatoryLeft > 0 ? 'is-clickable' : ''}`}
          onClick={mandatoryLeft > 0 ? () => setMissingModalType('mandatory') : undefined}
          title={mandatoryLeft > 0 ? 'Click to view required mandatory documents' : undefined}
          role={mandatoryLeft > 0 ? 'button' : undefined}
          tabIndex={mandatoryLeft > 0 ? 0 : undefined}
          onKeyDown={e => {
            if (mandatoryLeft > 0 && (e.key === 'Enter' || e.key === ' ')) {
              setMissingModalType('mandatory');
            }
          }}
        >
          <div className="bento-top">
            <span className="bento-lbl">Mandatory Documents</span>
            <ShieldCheck size={18} className="bento-icon" />
          </div>
          <div className="bento-val">
            {stats.mandatoryAvailableCount} <span className="bento-total-ratio">/ {stats.mandatoryCount}</span>
          </div>
          <div className="bento-bottom">
            <Progress value={mandatoryPct} />
            <div className="bento-footer-row">
              <small className={`bento-sub ${mandatoryLeft === 0 ? 'text-green' : 'text-amber'}`}>
                {mandatoryLeft === 0 ? 'All mandatory uploaded' : `${mandatoryLeft} mandatory still required`}
              </small>
              {mandatoryLeft > 0 && (
                <span className="bento-click-indicator">
                  View <ChevronRight size={13} />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Dialog Detail Missing Documents saat diklik */}
      {missingModalType && (
        <div className="modal-scrim" onClick={() => setMissingModalType(null)}>
          <div 
            className="modal bento-missing-modal" 
            onClick={e => e.stopPropagation()} 
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-head">
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <AlertCircle size={20} className={missingModalType === 'mandatory' ? 'text-danger' : 'text-amber'} />
                <h2>{activeModalTitle}</h2>
              </div>
              <button 
                type="button" 
                className="button icon only ghost" 
                onClick={() => setMissingModalType(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body" style={{padding: '16px 20px', maxHeight: '60vh', overflowY: 'auto'}}>
              <p className="muted" style={{fontSize: '12.5px', marginBottom: '14px'}}>
                The following documents are not yet uploaded or fulfilled for this application:
              </p>
              <ul className="bento-missing-dialog-list">
                {activeModalList.map((doc, idx) => (
                  <li key={idx} className="bento-missing-dialog-item">
                    <span className="doc-name">{doc.name}</span>
                    <span className={`mandatory-tag ${doc.mandatory ? 'tag-required' : 'tag-optional'}`}>
                      {doc.mandatory ? 'Mandatory' : 'Optional'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="modal-actions" style={{justifyContent: 'flex-end', padding: '12px 20px'}}>
              <button 
                type="button" 
                className="button primary" 
                onClick={() => setMissingModalType(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
