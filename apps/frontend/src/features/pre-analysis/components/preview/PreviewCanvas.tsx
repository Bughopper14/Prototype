/** Scrolling area that holds the original PDF or the digital twin. */
import {getStaticAssetUrl} from '@/features/pre-analysis/lib/text';
import {DigitalTwinDocument} from '@/features/pre-analysis/components/preview/DigitalTwinDocument';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function PreviewCanvas() {
  const {viewMode, pdfIframeRef} = usePreAnalysisContext();
  return (
    <div
      className="pre-analysis-canvas"
      style={{
        flex: 1,
        height: 'calc(100% - 42px)',
        overflowY: 'auto',
        overflowX: 'auto',
        background: '#f1f5f9',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      {viewMode === 'original-pdf' ? (
        <iframe
          ref={pdfIframeRef}
          src={`${getStaticAssetUrl('pre_analysis/pre_analysis_sample.pdf')}#toolbar=1`}
          title="Original Pre-Analysis PDF"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '700px',
            border: 'none',
            borderRadius: '4px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          }}
        />
      ) : (
        <DigitalTwinDocument />
      )}
    </div>
  );
}
