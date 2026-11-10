/** Entity title and the has-record yes / no toggle. */
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';
import type {PreAnalysisState} from '@/features/pre-analysis/hooks/usePreAnalysisState';
import type {EntitySlikReview} from '@/features/pre-analysis/lib/types';

export function SlikEntityHeader({
  entity,
  idx,
  fullEntityName,
  review,
  projectTypeLabel,
}: {
  entity: PreAnalysisState['slikEntities'][number];
  idx: number;
  fullEntityName: string;
  review: EntitySlikReview;
  projectTypeLabel: string;
}) {
  const {updateEntityReview, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <>
      {/* Header with Title and Toggle YES/NO */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
          <span style={{fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a'}}>
            {idx + 1}. {fullEntityName.toUpperCase()}
            {!review.hasRecord ? ' - No Records' : ' :'}
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#475569',
              background: '#e2e8f0',
              padding: '2px 8px',
              borderRadius: '10px',
            }}
          >
            {projectTypeLabel} · Head {entity.letter}
          </span>
        </div>

        {/* Toggle Yes/No Buttons */}
        <div style={{display: 'inline-flex', alignItems: 'center', gap: '8px'}}>
          <span style={{fontSize: '0.72rem', fontWeight: 600, color: '#475569'}}>Use Table Row Labels?</span>
          <div
            style={{
              display: 'inline-flex',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
              background: '#e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => {
                updateEntityReview(idx, {hasRecord: true});
                scrollToPreviewElement(`preana-preview-cell-slik-${idx}`);
              }}
              style={{
                padding: '4px 14px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: review.hasRecord ? '#16a34a' : 'transparent',
                color: review.hasRecord ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              ✓ YES
            </button>
            <button
              type="button"
              onClick={() => {
                updateEntityReview(idx, {hasRecord: false});
                scrollToPreviewElement(`preana-preview-cell-slik-${idx}`);
              }}
              style={{
                padding: '4px 14px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: !review.hasRecord ? '#dc2626' : 'transparent',
                color: !review.hasRecord ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              ✕ NO
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
