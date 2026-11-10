/** Title block of the document. */
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function PreviewDocHeader() {
  const {data} = usePreAnalysisContext();
  return (
    <div style={{marginBottom: '16px'}}>
      <h1
        style={{
          margin: 0,
          fontSize: '18pt',
          fontWeight: 800,
          color: '#1b365d',
          letterSpacing: '-0.2px',
        }}
      >
        PRE-ANALYSIS — EXPERT JUDGEMENT
      </h1>
      <div style={{fontSize: '11pt', fontWeight: 700, color: '#1b365d', marginTop: '2px'}}>
        (Quick Screening, Interview Base)
      </div>
      <div
        id="preana-preview-cell-preAnalysisNo"
        style={{
          fontSize: '10pt',
          color: data.preAnalysisNo?.includes('Auto') ? '#64748b' : '#000000',
          fontStyle: data.preAnalysisNo?.includes('Auto') ? 'italic' : 'normal',
          marginTop: '4px',
        }}
      >
        No. : {data.preAnalysisNo || 'Auto (Generated on save)'}
      </div>
    </div>
  );
}
