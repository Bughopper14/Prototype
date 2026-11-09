/** Preview toolbar: document identity, digital twin / PDF toggle, zoom, print. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {FileText, Printer, RotateCcw, ZoomIn, ZoomOut} from 'lucide-react';

export function PreviewToolbar() {
  const {data, viewMode, setViewMode, zoomLevel, setZoomLevel, handlePrint} = usePreAnalysis();
  return (
    <div
      className="pre-analysis-ribbon-toolbar"
      style={{
        height: '44px',
        minHeight: '44px',
        background: '#0f294a',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        borderRadius: '7px 7px 0 0',
        fontSize: '0.8rem',
        fontWeight: 600,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        boxSizing: 'border-box',
        gap: '10px',
      }}
    >
      {/* Left: Document Identity */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <FileText size={15} color="#93c5fd" style={{flexShrink: 0}} />
        <span
          style={{
            fontWeight: 700,
            fontSize: '0.8rem',
            letterSpacing: '0.02em',
            color: '#f8fafc',
            whiteSpace: 'nowrap',
          }}
        >
          PRE-ANALYSIS
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            color: '#94a3b8',
            borderLeft: '1px solid rgba(255,255,255,0.2)',
            paddingLeft: '8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Ref: <span style={{color: '#e2e8f0', fontWeight: 600}}>{data.preAnalysisNo}</span>
        </span>
      </div>

      {/* Right: Controls (Tabs, Zoom, Print) */}
      <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0}}>
        {/* View Toggle Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: '6px',
            padding: '2px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('digital-twin')}
            style={{
              background: viewMode === 'digital-twin' ? '#ffffff' : 'transparent',
              color: viewMode === 'digital-twin' ? '#0f294a' : 'rgba(255,255,255,0.8)',
              border: 'none',
              padding: '3px 9px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: viewMode === 'digital-twin' ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            Digital Twin
          </button>
          <button
            type="button"
            onClick={() => setViewMode('original-pdf')}
            style={{
              background: viewMode === 'original-pdf' ? '#ffffff' : 'transparent',
              color: viewMode === 'original-pdf' ? '#0f294a' : 'rgba(255,255,255,0.8)',
              border: 'none',
              padding: '3px 9px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: viewMode === 'original-pdf' ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            Original PDF
          </button>
        </div>

        {/* Zoom Controls */}
        {viewMode === 'digital-twin' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'rgba(0,0,0,0.25)',
              borderRadius: '6px',
              padding: '2px 5px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(0.4, Number((prev - 0.05).toFixed(2))))}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '2px 4px',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '3px',
              }}
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span
              style={{
                fontSize: '0.72rem',
                minWidth: '38px',
                textAlign: 'center',
                fontWeight: 700,
                color: '#f8fafc',
              }}
            >
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(1.2, Number((prev + 0.05).toFixed(2))))}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '2px 4px',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '3px',
              }}
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(0.75)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '2px 4px',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '3px',
              }}
              title="Reset Zoom"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        )}

        {/* Print Button */}
        <button
          type="button"
          onClick={handlePrint}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: '#ffffff',
            color: '#0f294a',
            border: 'none',
            padding: '4px 10px',
            borderRadius: '5px',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}
        >
          <Printer size={13} /> Print
        </button>
      </div>
    </div>
  );
}
