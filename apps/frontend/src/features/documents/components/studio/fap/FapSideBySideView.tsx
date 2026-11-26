/** Screen 5 of Redesign 2: Side by side comparison view with section pills and dual zoomable panes. */
import {useState} from 'react';
import {Eye, FileSpreadsheet, Minus, Plus} from 'lucide-react';
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
    activeFileUrl,
    activeFiles,
    fapComparison,
    liveFapData,
    ocrFapData,
    pdfViewerSrc,
    rightViewMode,
    setRightViewMode,
    systemZoom,
    setSystemZoom,
    handleFitBothDocuments,
    fapNavFilter,
    fapNavTick,
    scrollToFapSection,
    fapComparisonContainerRef,
  } = useDocumentsStudioContext();

  const [origZoomPct, setOrigZoomPct] = useState<number | 'fit'>('fit');
  const zoomOut = () => setSystemZoom(z => Math.max(0.08, Number((z - 0.05).toFixed(2))));
  const zoomIn = () => setSystemZoom(z => Math.min(1.5, Number((z + 0.05).toFixed(2))));
  const origZoomOut = () => setOrigZoomPct(z => Math.max(50, (z === 'fit' ? 100 : z) - 25));
  const origZoomIn = () => setOrigZoomPct(z => Math.min(250, (z === 'fit' ? 100 : z) + 25));
  const origPdfSrc = activeFileUrl
    ? `${activeFileUrl.split('#')[0]}#${origZoomPct === 'fit' ? 'view=FitH' : `zoom=${origZoomPct}`}`
    : pdfViewerSrc;
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
          <div className={`fap-r2-doc-head ${rightViewMode === 'pdf' ? 'mode-original' : 'mode-ocr'}`}>
            <div>
              <h4>{rightViewMode === 'pdf' ? 'Original uploaded file' : 'Signed form (OCR)'}</h4>
              <p title={activeFile?.fileName || ''}>{activeFile?.fileName || 'Signed FAP'}</p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <div className="fap-r2-seg compact" role="tablist" aria-label="Right pane mode">
                <button
                  type="button"
                  className={rightViewMode === 'ocr' ? 'on mode-ocr' : ''}
                  onClick={() => setRightViewMode('ocr')}
                >
                  <FileSpreadsheet size={12} /> OCR
                </button>
                <button
                  type="button"
                  className={rightViewMode === 'pdf' ? 'on mode-original' : ''}
                  onClick={() => setRightViewMode('pdf')}
                >
                  <Eye size={12} /> Original
                </button>
              </div>
              <div className="fap-r2-zoom-group">
                <button
                  type="button"
                  onClick={rightViewMode === 'pdf' ? origZoomOut : zoomOut}
                  aria-label="Zoom out"
                >
                  <Minus size={13} />
                </button>
                <button
                  type="button"
                  className="fit-btn"
                  onClick={rightViewMode === 'pdf' ? () => setOrigZoomPct('fit') : handleFitBothDocuments}
                >
                  {rightViewMode === 'pdf' && origZoomPct !== 'fit' ? `${origZoomPct}%` : 'Fit width'}
                </button>
                <button
                  type="button"
                  onClick={rightViewMode === 'pdf' ? origZoomIn : zoomIn}
                  aria-label="Zoom in"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>
          <div className="fap-r2-doc-body">
            {rightViewMode === 'pdf' && activeFileUrl ? (
              activeFile?.mimeType === 'application/pdf' ||
              activeFile?.fileName?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  key={origPdfSrc}
                  src={origPdfSrc}
                  title="Original signed FAP file"
                  style={{width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff'}}
                />
              ) : (
                <div style={{width: '100%', height: '100%', overflow: 'auto', display: 'grid', placeItems: 'center', background: '#fff', borderRadius: 8}}>
                  <img
                    src={activeFileUrl}
                    alt="Original signed FAP file"
                    style={{
                      width: origZoomPct === 'fit' ? '100%' : `${origZoomPct}%`,
                      maxWidth: origZoomPct === 'fit' ? '100%' : 'none',
                      height: 'auto',
                    }}
                  />
                </div>
              )
            ) : (
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
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
