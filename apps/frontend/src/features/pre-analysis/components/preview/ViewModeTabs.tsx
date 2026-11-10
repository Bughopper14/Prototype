/** Switch between the digital twin and the original PDF. */
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function ViewModeTabs() {
  const {setViewMode, viewMode} = usePreAnalysisContext();
  return (
    <>
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
    </>
  );
}
