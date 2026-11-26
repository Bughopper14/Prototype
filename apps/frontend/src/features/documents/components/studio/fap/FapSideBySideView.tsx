/** Screen 5 of Redesign 2: Side by side comparison view with section pills and dual zoomable panes. */
import {Minus, Plus} from 'lucide-react';
import {FapSheetPreview} from '@/features/crm/components/lazy';
import {printFapDocument} from '@/features/fap/lib/print';
import {FAP_SECTIONS} from '@/features/documents/lib/fap-comparison-rows';
import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function FapSideBySideView({
  viewMode,
  setViewMode,
}: {
  viewMode: 'comparison' | 'side-by-side';
  setViewMode: (v: 'comparison' | 'side-by-side') => void;
}) {
  const {
    a,
    activeFile,
    activeFiles,
    fapComparison,
    liveFapData,
    ocrFapData,
    systemZoom,
    setSystemZoom,
    handleFitBothDocuments,
    fapNavFilter,
    fapNavTick,
    scrollToFapSection,
    fapComparisonContainerRef,
  } = useDocumentsStudioContext();

  const zoomOut = () => setSystemZoom(z => Math.max(0.08, Number((z - 0.05).toFixed(2))));
  const zoomIn = () => setSystemZoom(z => Math.min(1.5, Number((z + 0.05).toFixed(2))));
  const activeDiffs = activeFiles.length > 0 && fapComparison ? fapComparison.diffs || [] : [];

  return (
    <div className="fap-r2-section">
      {/* Toolbar: [Data comparison | Side by side]   [All] [1 Identity] [2 Domicile] ... [9 Financials] */}
      <div className="fap-r2-toolbar side-by-side">
        <div className="fap-r2-seg" role="tablist" aria-label="Document view mode">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'comparison'}
            className={viewMode === 'comparison' ? 'on' : ''}
            onClick={() => setViewMode('comparison')}
          >
            Data comparison
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'side-by-side'}
            className={viewMode === 'side-by-side' ? 'on' : ''}
            onClick={() => setViewMode('side-by-side')}
          >
            Side by side
          </button>
        </div>

        <div className="fap-r2-sec-pills" role="tablist" aria-label="FAP sections">
          <button
            type="button"
            className={`fap-r2-sec-pill ${fapNavFilter === 'all' ? 'active' : ''}`}
            onClick={() => scrollToFapSection('all')}
          >
            All
          </button>
          {FAP_SECTIONS.map(sec => (
            <button
              key={sec.id}
              type="button"
              className={`fap-r2-sec-pill ${fapNavFilter === sec.id ? 'active' : ''}`}
              onClick={() => scrollToFapSection(sec.id)}
            >
              {sec.pillLabel}
            </button>
          ))}
        </div>
      </div>

      {/* 2-column 50/50 split */}
      <div className="fap-r2-sbs-grid" ref={fapComparisonContainerRef}>
        <section className="fap-r2-doc-pane fap-pane-card">
          <div className="fap-r2-doc-head">
            <div>
              <h4>System data</h4>
              <p>Live database ({a.fapNumber || '-'})</p>
            </div>
            <div className="fap-r2-zoom-group">
              <button type="button" onClick={zoomOut} aria-label="Zoom out">
                <Minus size={13} />
              </button>
              <button type="button" className="fit-btn" onClick={handleFitBothDocuments}>
                Fit width
              </button>
              <button type="button" onClick={zoomIn} aria-label="Zoom in">
                <Plus size={13} />
              </button>
            </div>
          </div>
          <div className="fap-r2-doc-body">
            <FapSheetPreview
              data={liveFapData}
              application={a}
              customer={a.customer}
              profile={a.profile || a}
              pic={a.pic}
              isComparison={true}
              hideToolbar={true}
              diffSide="system"
              diffs={activeDiffs}
              externalZoom={systemZoom}
              activeSection={fapNavFilter === 'all' ? undefined : fapNavFilter}
              syncTick={fapNavTick}
              onPrint={() => printFapDocument(a.fapNumber, 'system')}
            />
          </div>
        </section>

        <section className="fap-r2-doc-pane fap-pane-card">
          <div className="fap-r2-doc-head">
            <div>
              <h4>Signed form (OCR)</h4>
              <p title={activeFile?.fileName || ''}>{activeFile?.fileName || 'Signed FAP'}</p>
            </div>
            <div className="fap-r2-zoom-group">
              <button type="button" onClick={zoomOut} aria-label="Zoom out">
                <Minus size={13} />
              </button>
              <button type="button" className="fit-btn" onClick={handleFitBothDocuments}>
                Fit width
              </button>
              <button type="button" onClick={zoomIn} aria-label="Zoom in">
                <Plus size={13} />
              </button>
            </div>
          </div>
          <div className="fap-r2-doc-body">
            <FapSheetPreview
              data={ocrFapData}
              isComparison={true}
              hideToolbar={true}
              diffSide="ocr"
              diffs={activeDiffs}
              externalZoom={systemZoom}
              activeSection={fapNavFilter === 'all' ? undefined : fapNavFilter}
              syncTick={fapNavTick}
              onPrint={() => printFapDocument(a.fapNumber, 'ocr')}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
