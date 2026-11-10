/** Ribbon above the FAP sheet: file badge, zoom, print and the section quick-jump chips. */
import {useEffect, useRef} from 'react';
import {FileSpreadsheet, ZoomIn, ZoomOut, RotateCcw, Printer, ChevronLeft, ChevronRight} from 'lucide-react';

const SECTION_CHIPS = [
  {id: 'fap-preview-sec-header', label: '1. Identity'},
  {id: 'fap-preview-sec-company', label: '2. Domicile'},
  {id: 'fap-preview-sec-business', label: '3. Profile'},
  {id: 'fap-preview-sec-pic', label: '4. PIC'},
  {id: 'fap-preview-sec-purpose-assets', label: '5. Purpose & Assets'},
  {id: 'fap-preview-sec-projects', label: '6. Projects'},
  {id: 'fap-preview-sec-banks', label: '7. References'},
  {id: 'fap-preview-sec-proposal', label: '8. Financing Proposal'},
  {id: 'fap-preview-sec-financial', label: '9. Financial Statements'},
];

export function SheetRibbon({
  zoomLevel,
  onZoomOut,
  onZoomIn,
  onResetZoom,
  onPrint,
  activeSection,
  onSectionClick,
}: {
  zoomLevel: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onResetZoom: () => void;
  onPrint: () => void;
  activeSection?: string | null;
  onSectionClick?: (id: string) => void;
}) {
  const chipsScrollRef = useRef<HTMLDivElement>(null);

  const scrollChips = (dir: 'left' | 'right') => {
    if (chipsScrollRef.current) {
      const offset = dir === 'left' ? -180 : 180;
      chipsScrollRef.current.scrollBy({left: offset, behavior: 'smooth'});
    }
  };

  useEffect(() => {
    if (activeSection && chipsScrollRef.current) {
      const activeEl = chipsScrollRef.current.querySelector<HTMLElement>('.excel-chip-btn.active');
      if (activeEl) {
        activeEl.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'center'});
      }
    }
  }, [activeSection]);

  return (
    <div className="excel-fap-ribbon">
      {/* Top Utility Tier: Document Info, Zoom, Print */}
      <div className="excel-ribbon-top-tier">
        <div className="excel-ribbon-left">
          <FileSpreadsheet size={16} className="excel-brand-icon" />
          <div className="excel-file-badge">
            <span className="excel-file-name">Application Form APPROVED.xlsx</span>
            <span className="excel-tab-badge">Sheet: APPROVED v01.2025</span>
          </div>
          <span className="excel-live-tag">
            <i className="excel-live-dot" />
            LIVE AUTOFILLED
          </span>
        </div>

        <div className="excel-ribbon-right">
          <div className="excel-zoom-controls">
            <button onClick={onZoomOut} title="Zoom Out">
              <ZoomOut size={13} />
            </button>
            <span className="excel-zoom-btn-label">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={onZoomIn} title="Zoom In">
              <ZoomIn size={13} />
            </button>
            <button onClick={onResetZoom} title="Reset Zoom">
              <RotateCcw size={13} />
            </button>
          </div>
          <button className="excel-print-btn" onClick={onPrint} title="Print Document">
            <Printer size={13} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Sub Tier: Harmonious Section Quick-Jump Tabs with Slider */}
      <div className="excel-ribbon-sub-tier">
        <button
          type="button"
          className="excel-chips-scroll-btn left"
          onClick={() => scrollChips('left')}
          title="Slide Left (View Earlier Sections)"
        >
          <ChevronLeft size={14} />
        </button>
        <div
          className="excel-section-chips"
          ref={chipsScrollRef}
          onWheel={e => {
            if (chipsScrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              chipsScrollRef.current.scrollLeft += e.deltaY;
            }
          }}
        >
          {SECTION_CHIPS.map(chip => (
            <button
              key={chip.id}
              type="button"
              className={`excel-chip-btn ${activeSection === chip.id ? 'active' : ''}`}
              onClick={() => onSectionClick?.(chip.id)}
              title={`Jump to ${chip.label}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="excel-chips-scroll-btn right"
          onClick={() => scrollChips('right')}
          title="Slide Right (View Further Sections)"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
