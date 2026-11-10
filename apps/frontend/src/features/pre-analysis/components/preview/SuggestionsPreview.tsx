/** Suggestion bullet points of the document. */
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function SuggestionsPreview() {
  const {handlePreviewCellClick, data} = usePreAnalysisContext();
  return (
    <div
      id="preana-preview-cell-suggestions"
      onClick={() => handlePreviewCellClick('suggestions', 'sec7')}
      style={{marginBottom: '14px', fontSize: '8.5pt', cursor: 'pointer'}}
    >
      <span style={{fontWeight: 700}}>Suggestion:</span>
      <ul style={{margin: '4px 0 0 0', paddingLeft: '20px'}}>
        {(data.suggestions || []).map((s, idx) => (
          <li key={idx} style={{marginBottom: '2px'}}>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
