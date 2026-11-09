/** FAP view, left pane: last system-generated FAP document. */
import {FapSheetPreview} from '@/features/crm/components/lazy';
import {printFapDocument} from '@/features/fap/lib/print';
import {FileSpreadsheet, Printer, ZoomIn, ZoomOut} from 'lucide-react';

import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function SystemDocumentPane() {
  const {
    a,
    fapComparison,
    systemZoom,
    setSystemZoom,
    handleFitBothDocuments,
    fapNavFilter,
    fapNavTick,
    activeFiles,
    liveFapData,
  } = useDocumentsStudioContext();
  return (
    <div className="fap-pane-card">
      <div className="fap-pane-head">
        <div className="fap-pane-head-top">
          <div className="fap-pane-head-info">
            <h4>
              <FileSpreadsheet size={16} color="#002060" />
              System FAP Document (Last Generated)
            </h4>
            <span className="fap-pane-head-sub">
              Current live database data · FAP No: {a.fapNumber || '-'}
            </span>
          </div>
          <div className="fap-pane-head-actions">
            <button
              type="button"
              className="button small"
              onClick={() => printFapDocument(a.fapNumber)}
              title="Print system FAP form"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11.5px',
                height: '26px',
                padding: '2px 10px',
              }}
            >
              <Printer size={13} /> Print Form
            </button>
          </div>
        </div>
        <div className="fap-pane-head-bottom">
          <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto'}}>
            <span style={{fontSize: '11.5px', color: '#334155', fontWeight: 600}}>Zoom:</span>
            <div className="excel-zoom-controls compact">
              <button
                type="button"
                onClick={() => setSystemZoom(z => Math.max(0.05, Number((z - 0.05).toFixed(2))))}
                className="excel-zoom-btn btn-zoom-icon"
                title="Zoom Out (-)"
              >
                <ZoomOut size={13} />
              </button>
              <span className="excel-zoom-val">{Math.round(systemZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setSystemZoom(z => Math.min(1.5, Number((z + 0.05).toFixed(2))))}
                className="excel-zoom-btn btn-zoom-icon"
                title="Zoom In (+)"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                onClick={handleFitBothDocuments}
                className="excel-zoom-btn btn-fit excel-zoom-fit-btn"
                title="Fit both documents to screen size"
              >
                Fit
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="fap-pane-body fap-pane-body-system">
        <FapSheetPreview
          data={liveFapData}
          isComparison={true}
          hideToolbar={true}
          diffSide="system"
          diffs={activeFiles.length > 0 && fapComparison ? fapComparison.diffs || [] : []}
          externalZoom={systemZoom}
          activeSection={fapNavFilter === 'all' ? undefined : fapNavFilter}
          syncTick={fapNavTick}
          onPrint={() => printFapDocument(a.fapNumber)}
        />
      </div>
    </div>
  );
}
