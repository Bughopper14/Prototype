/** Recommendation. */
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function RecommendationField() {
  const {
    reqMark,
    isNotRecommended,
    isRecommended,
    isProcessWithAr,
    isFullDoc,
    data,
    updateField,
    scrollToPreviewElement,
  } = usePreAnalysisContext();
  return (
    <div>
      <label
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#475569',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <span>RECOMMENDATION{reqMark('recommendation', 'Expert Judgement Conclusion')}</span>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: isNotRecommended ? '#b91c1c' : isRecommended ? '#15803d' : '#64748b',
          }}
        >
          {isNotRecommended
            ? '✕ NOT RECOMMENDED TO FULL DOCUMENTATION'
            : isProcessWithAr
              ? '✓ RECOMMENDED PROCESS WITH AR MANAGEMENT'
              : isFullDoc
                ? '✓ RECOMMENDED TO FULL DOCUMENTATION'
                : '—'}
        </span>
      </label>
      <div id="preana-input-recommendation" data-field="recommendation" style={{position: 'relative'}}>
        <select
          id="select-preana-recommendation"
          name="recommendation"
          data-field="recommendation"
          value={data.recommendation ? data.recommendation.toUpperCase() : ''}
          onChange={e => {
            updateField('recommendation', e.target.value);
            scrollToPreviewElement('preana-preview-cell-recommendation');
          }}
          onFocus={() => scrollToPreviewElement('preana-preview-cell-recommendation')}
          style={{
            width: '100%',
            height: '42px',
            padding: '0 14px',
            fontSize: '0.85rem',
            fontWeight: 700,
            borderRadius: '6px',
            cursor: 'pointer',
            boxSizing: 'border-box',
            transition: 'all 0.15s ease',
            border: isNotRecommended
              ? '2px solid #ef4444'
              : isRecommended
                ? '2px solid #16a34a'
                : '1px solid #cbd5e1',
            background: isNotRecommended ? '#fef2f2' : isRecommended ? '#f0fdf4' : '#ffffff',
            color: isNotRecommended ? '#991b1b' : isRecommended ? '#166534' : '#1e293b',
          }}
        >
          <option value="" hidden></option>
          <option value="RECOMMENDED TO FULL DOCUMENTATION">RECOMMENDED TO FULL DOCUMENTATION</option>
          <option value="RECOMMENDED PROCESS WITH AR MANAGEMENT">
            RECOMMENDED PROCESS WITH AR MANAGEMENT
          </option>
          <option value="NOT RECOMMENDED TO FULL DOCUMENTATION">NOT RECOMMENDED TO FULL DOCUMENTATION</option>
        </select>
      </div>
    </div>
  );
}
