/** Recommendation callout of the document. */
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function RecommendationPreview() {
  const {handlePreviewCellClick, hasSelectedRecommendation, isNotRecommended, data} = usePreAnalysisContext();
  return (
    <div
      id="preana-preview-cell-recommendation"
      onClick={() => handlePreviewCellClick('recommendation', 'sec7')}
      style={{
        background: !hasSelectedRecommendation ? '#ffffff' : isNotRecommended ? '#fee2e2' : '#dcfce7',
        border: `2px solid ${
          !hasSelectedRecommendation ? '#cbd5e1' : isNotRecommended ? '#ef4444' : '#16a34a'
        }`,
        color: !hasSelectedRecommendation ? '#000000' : isNotRecommended ? '#991b1b' : '#166534',
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
      RECOMMENDATION: {hasSelectedRecommendation ? data.recommendation.toUpperCase() : '—'}
    </div>
  );
}
