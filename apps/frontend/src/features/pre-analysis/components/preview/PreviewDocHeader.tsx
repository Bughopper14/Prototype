/** Preview: document title and number. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';

export function PreviewDocHeader() {
  const {data} = usePreAnalysis();
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
        style={{fontSize: '10pt', color: '#000000', marginTop: '4px'}}
      >
        No. : {data.preAnalysisNo}
      </div>
    </div>
  );
}
