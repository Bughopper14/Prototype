/** Preview: recommendation callout. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';

export function RecommendationPreview() {
  const {data, isRecommended, handlePreviewCellClick} = usePreAnalysis();
  return (
    <div
      id="preana-preview-cell-recommendation"
      onClick={() => handlePreviewCellClick('recommendation', 'sec7')}
      style={{
        background: isRecommended ? '#dcfce7' : '#fee2e2',
        border: `2px solid ${isRecommended ? '#22c55e' : '#ef4444'}`,
        color: isRecommended ? '#166534' : '#991b1b',
        padding: '8px 12px',
        borderRadius: '4px',
        fontWeight: 800,
        fontSize: '11pt',
        textAlign: 'center',
        marginBottom: '12px',
        letterSpacing: '0.3px',
        cursor: 'pointer',
      }}
    >
      RECOMMENDATION: {data.recommendation || (isRecommended ? 'RECOMMENDED' : 'NOT RECOMMENDED')}
    </div>
  );
}
