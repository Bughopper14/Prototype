/** Screen 4 of Redesign 2: Focused 3-column document view with zoomed spotlight + value callout on both panes. */
import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ChevronLeft, ChevronRight, Eye, FileSpreadsheet, Minus, Plus} from 'lucide-react';
import {FapSheetPreview} from '@/features/crm/components/lazy';
import {resolveFieldCellIds} from '@/features/fap/lib/field-cells';
import {printFapDocument} from '@/features/fap/lib/print';
import {
  FAP_SECTIONS,
  type ComparisonRow,
} from '@/features/documents/lib/fap-comparison-rows';
import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

/** Base scale corresponding to "100%" in the Focus view (fit-width is ~0.20, so 150% = 0.30). */
const BASE_FOCUS_SCALE = 0.2;

/** Injects a dim backdrop, crisp colored border, and floating value pill onto the focused cell inside an iframe. */
function applyFocusSpotlight(
  iframe: HTMLIFrameElement | null,
  cellIds: string[],
  pillText: string,
  tone: 'system' | 'ocr',
) {
  if (!iframe || !cellIds.length) return;
  try {
    const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
    const win = iframe.contentWindow;
    if (!iDoc || !win || !iDoc.body) return;

    // Remove previous spotlight overlay if any
    iDoc.getElementById('fap-r2-spotlight-root')?.remove();
    const targets = cellIds.map(id => iDoc.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!targets.length) return;

    // Ensure positioning context on body
    if (win.getComputedStyle(iDoc.body).position === 'static') {
      iDoc.body.style.position = 'relative';
    }

    const zoom = parseFloat(iDoc.body.style.zoom || '1') || 1;
    const bodyRect = iDoc.body.getBoundingClientRect();

    // Compute exact union box relative to body's top-left (cancels scroll, margins, and table borders)
    const rects = targets.map(t => t.getBoundingClientRect());
    const minLeft = Math.min(...rects.map(r => r.left));
    const minTop = Math.min(...rects.map(r => r.top));
    const maxRight = Math.max(...rects.map(r => r.right));
    const maxBottom = Math.max(...rects.map(r => r.bottom));

    const left = (minLeft - bodyRect.left) / zoom;
    const top = (minTop - bodyRect.top) / zoom;
    const width = (maxRight - minLeft) / zoom;
    const height = (maxBottom - minTop) / zoom;

    const borderColor = tone === 'system' ? '#2563eb' : '#f59e0b';
    const fillColor = tone === 'system' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(245, 158, 11, 0.12)';
    const pillBg = tone === 'system' ? '#2563eb' : '#f59e0b';

    const root = iDoc.createElement('div');
    root.id = 'fap-r2-spotlight-root';
    root.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9999;';

    const pad = Math.round(4 / zoom);
    const box = iDoc.createElement('div');
    box.style.cssText = [
      'position:absolute',
      `left:${Math.max(0, left - pad)}px`,
      `top:${Math.max(0, top - pad)}px`,
      `width:${width + pad * 2}px`,
      `height:${height + pad * 2}px`,
      `border:${Math.max(4, Math.round(2.5 / zoom))}px solid ${borderColor}`,
      `border-radius:${Math.round(6 / zoom)}px`,
      `background:${fillColor}`,
      'box-shadow:0 0 0 99999px rgba(15, 23, 42, 0.18)',
      'box-sizing:border-box',
    ].join(';');

    const pill = iDoc.createElement('div');
    pill.textContent = pillText;
    const pillFontSize = Math.round(13 / zoom);
    pill.style.cssText = [
      'position:absolute',
      'left:0',
      `bottom:calc(100% + ${Math.round(8 / zoom)}px)`,
      `background:${pillBg}`,
      'color:#ffffff',
      `font-family:'Outfit',system-ui,sans-serif`,
      `font-size:${pillFontSize}px`,
      'font-weight:700',
      'line-height:1.25',
      `padding:${Math.round(5 / zoom)}px ${Math.round(12 / zoom)}px`,
      `border-radius:${Math.round(8 / zoom)}px`,
      'white-space:nowrap',
      `max-width:${Math.round(340 / zoom)}px`,
      'overflow:hidden',
      'text-overflow:ellipsis',
      'box-shadow:0 6px 18px rgba(15, 23, 42, 0.22)',
    ].join(';');

    box.appendChild(pill);
    root.appendChild(box);
    iDoc.body.appendChild(root);

    // Center the focused cell horizontally and vertically inside the pane
    const centerX = (left + width / 2) * zoom;
    const centerY = (top + height / 2) * zoom;
    win.scrollTo({
      left: Math.max(0, centerX - win.innerWidth / 2),
      top: Math.max(0, centerY - win.innerHeight / 2),
      behavior: 'smooth',
    });
  } catch {
    // Ignore transient iframe lifecycle errors
  }
}

export function FapFocusDocumentView({
  rows,
  focusedField,
  onSelectField,
  onBack,
}: {
  rows: ComparisonRow[];
  focusedField: string;
  onSelectField: (field: string) => void;
  onBack: () => void;
}) {
  const {a, activeFile, activeFiles, activeFileUrl, fapComparison, liveFapData, ocrFapData} =
    useDocumentsStudioContext();
  const [focusPct, setFocusPct] = useState<number>(150);
  const [rightPaneMode, setRightPaneMode] = useState<'ocr' | 'original'>('ocr');
  const [origFitWidth, setOrigFitWidth] = useState<boolean>(true);
  const gridRef = useRef<HTMLDivElement>(null);
  const isImage = !!(activeFile?.fileName && /\.(png|jpe?g|webp|gif|bmp)$/i.test(activeFile.fileName));
  const origPdfSrc = activeFileUrl
    ? `${activeFileUrl.split('#')[0]}#${origFitWidth ? 'view=FitH' : `zoom=${focusPct}`}`
    : '';

  const currentIdx = Math.max(
    0,
    rows.findIndex(r => r.field === focusedField),
  );
  const current = rows[currentIdx];

  const effectiveZoom = Number(((focusPct / 100) * BASE_FOCUS_SCALE).toFixed(3));

  // Apply spotlight & center scroll on both iframes whenever the focused field or zoom changes
  useEffect(() => {
    if (!current) return;
    const sysCellIds = resolveFieldCellIds(current.field, null, liveFapData);
    const ocrCellIds = resolveFieldCellIds(current.field, null, ocrFapData);
    if (!sysCellIds.length && !ocrCellIds.length) return;

    const sysLabel = current.systemValue || 'Empty';
    const ocrLabel = current.ocrValue || 'Not on document';

    const run = () => {
      const container = gridRef.current;
      if (!container) return;
      const sysIframe = container.querySelector<HTMLIFrameElement>('iframe.excel-fap-iframe-system');
      const ocrIframe = container.querySelector<HTMLIFrameElement>('iframe.excel-fap-iframe-ocr');
      applyFocusSpotlight(sysIframe, sysCellIds, sysLabel, 'system');
      applyFocusSpotlight(ocrIframe, ocrCellIds, ocrLabel, 'ocr');
    };

    // Run after iframe sync settles (handles both initial mount and field switches)
    const t1 = window.setTimeout(run, 180);
    const t2 = window.setTimeout(run, 520);
    const t3 = window.setTimeout(run, 950);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [current?.field, current?.systemValue, current?.ocrValue, effectiveZoom, rightPaneMode]);

  if (!current) return null;

  const sectionRows = rows.filter(r => r.sectionId === current.sectionId);
  const sectionsWithRows = FAP_SECTIONS.filter(s => rows.some(r => r.sectionId === s.id));
  const curSecIdx = sectionsWithRows.findIndex(s => s.id === current.sectionId);
  const nextSection =
    sectionsWithRows.length > 1 ? sectionsWithRows[(curSecIdx + 1) % sectionsWithRows.length] : null;
  const nextSectionRows = nextSection ? rows.filter(r => r.sectionId === nextSection.id) : [];

  const zoomOut = () => {
    setOrigFitWidth(false);
    setFocusPct(p => Math.max(50, p - 25));
  };
  const zoomIn = () => {
    setOrigFitWidth(false);
    setFocusPct(p => Math.min(250, p + 25));
  };

  const activeDiffs = activeFiles.length > 0 && fapComparison ? fapComparison.diffs || [] : [];

  return (
    <div className="fap-r2-section">
      {/* Top focus navigation bar */}
      <div className="fap-r2-focus-bar">
        <div className="fap-r2-focus-bar-left">
          <button type="button" className="fap-r2-btn-outline" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back to comparison</span>
          </button>
          <span className="fap-r2-focus-sep" />
          <span className="fap-r2-focus-counter">
            {current.status === 'match' ? 'Field' : 'Difference'} {currentIdx + 1} of {rows.length}
          </span>
          <strong className="fap-r2-focus-title">{current.label}</strong>
          <span className="fap-r2-focus-sec-pill">{current.sectionLabel}</span>
        </div>

        <div className="fap-r2-focus-bar-right">
          <span className={`fap-r2-status-pill ${current.status}`}>
            {current.status === 'noted' ? 'Noted' : current.status === 'match' ? 'Match' : 'Different'}
          </span>
          <button
            type="button"
            className="fap-r2-btn-outline compact"
            disabled={currentIdx <= 0}
            onClick={() => rows[currentIdx - 1] && onSelectField(rows[currentIdx - 1].field)}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            type="button"
            className="fap-r2-btn-outline compact"
            disabled={currentIdx >= rows.length - 1}
            onClick={() => rows[currentIdx + 1] && onSelectField(rows[currentIdx + 1].field)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 3-column grid: left differences sidebar + System data + Signed form OCR */}
      <div className="fap-r2-focus-grid" ref={gridRef}>
        <aside className="fap-r2-focus-sidebar">
          <div className="fap-r2-focus-side-head">
            <span>DIFFERENCES — {current.sectionLabel.toUpperCase()}</span>
            <em>
              {sectionRows.length} of {rows.length}
            </em>
          </div>

          <div className="fap-r2-focus-side-list">
            {sectionRows.map(item => {
              const active = item.field === current.field;
              const sysText = item.systemValue || 'Empty';
              const ocrText = item.ocrValue || 'Not on document';
              return (
                <button
                  key={item.field}
                  type="button"
                  className={`fap-r2-focus-item ${active ? 'active' : ''}`}
                  onClick={() => onSelectField(item.field)}
                >
                  <div className="fap-r2-focus-item-label">{item.label}</div>
                  <div className="fap-r2-focus-item-vals">
                    <span>{sysText}</span>
                    <span className="fap-r2-arrow">→</span>
                    <span className={item.status === 'match' ? '' : 'is-diff'}>{ocrText}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {nextSection && nextSectionRows.length > 0 && (
            <button
              type="button"
              className="fap-r2-focus-next-sec"
              onClick={() => onSelectField(nextSectionRows[0].field)}
            >
              Next section: {nextSection.shortLabel} ({nextSectionRows.length})
            </button>
          )}
        </aside>

        {/* System data pane */}
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
              <span>{focusPct}%</span>
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
              externalZoom={effectiveZoom}
              onPrint={() => printFapDocument(a.fapNumber, 'system')}
            />
          </div>
        </section>

        {/* Signed form OCR / Original file pane */}
        <section className="fap-r2-doc-pane fap-pane-card">
          <div className={`fap-r2-doc-head ${rightPaneMode === 'original' ? 'mode-original' : 'mode-ocr'}`}>
            <div>
              <h4>{rightPaneMode === 'original' ? 'Original file' : 'Signed form (OCR)'}</h4>
              <p title={activeFile?.fileName || ''}>{activeFile?.fileName || 'Signed FAP'}</p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
              {activeFileUrl && (
                <div className="fap-r2-seg compact" role="tablist" aria-label="Right pane view">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightPaneMode === 'ocr'}
                    className={rightPaneMode === 'ocr' ? 'on mode-ocr' : ''}
                    onClick={() => setRightPaneMode('ocr')}
                  >
                    <FileSpreadsheet size={12} /> OCR
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightPaneMode === 'original'}
                    className={rightPaneMode === 'original' ? 'on mode-original' : ''}
                    onClick={() => setRightPaneMode('original')}
                  >
                    <Eye size={12} /> Original
                  </button>
                </div>
              )}
              <div className="fap-r2-zoom-group">
                <button type="button" onClick={zoomOut} aria-label="Zoom out">
                  <Minus size={13} />
                </button>
                {rightPaneMode === 'original' ? (
                  <button type="button" className="fit-btn" onClick={() => setOrigFitWidth(true)}>
                    {origFitWidth ? 'Fit width' : `${focusPct}%`}
                  </button>
                ) : (
                  <span>{focusPct}%</span>
                )}
                <button type="button" onClick={zoomIn} aria-label="Zoom in">
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>
          <div className="fap-r2-doc-body">
            {rightPaneMode === 'original' && activeFileUrl ? (
              isImage ? (
                <div style={{height: '100%', overflow: 'auto', padding: 12, textAlign: 'center', background: '#f8fafc'}}>
                  <img
                    src={activeFileUrl}
                    alt={activeFile?.fileName || 'Original FAP'}
                    style={{
                      width: origFitWidth ? '100%' : `${focusPct}%`,
                      maxWidth: origFitWidth ? '100%' : 'none',
                      height: 'auto',
                      boxShadow: '0 2px 10px rgba(15,23,42,0.08)',
                    }}
                  />
                </div>
              ) : (
                <iframe
                  key={origPdfSrc}
                  src={origPdfSrc}
                  title={activeFile?.fileName || 'Original FAP'}
                  style={{width: '100%', height: '100%', border: 0, display: 'block', background: '#fff'}}
                />
              )
            ) : (
              <FapSheetPreview
                data={ocrFapData}
                isComparison={true}
                hideToolbar={true}
                diffSide="ocr"
                diffs={activeDiffs}
                externalZoom={effectiveZoom}
                onPrint={() => printFapDocument(a.fapNumber, 'ocr')}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
