/** Zoom out, zoom in and reset of the digital twin. */
import {ZoomOut, ZoomIn, RotateCcw} from 'lucide-react';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function ZoomControls() {
  const {viewMode, setZoomLevel, zoomLevel} = usePreAnalysisContext();
  return (
    <>
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
            onClick={() => setZoomLevel(prev => Math.max(0.35, Number((prev - 0.05).toFixed(2))))}
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
            onClick={() => setZoomLevel(prev => Math.min(1.6, Number((prev + 0.05).toFixed(2))))}
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
    </>
  );
}
