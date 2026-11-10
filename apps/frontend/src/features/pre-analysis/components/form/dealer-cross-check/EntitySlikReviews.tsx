/** SLIK / bureau review of every group entity, one card per entity. */
import {EntitySlikCard} from '@/features/pre-analysis/components/form/dealer-cross-check/EntitySlikCard';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function EntitySlikReviews() {
  const {slikEntities} = usePreAnalysisContext();
  return (
    <>
      {/* Per-PT from Subsection 3 Group Structure with Toggle YES/NO */}
      <div style={{marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px'}}>
        <div style={{fontSize: '0.8rem', fontWeight: 700, color: '#0f294a', marginBottom: '8px'}}>
          GROUP ENTITY LIST FOR SLIK / BUREAU REVIEW:
        </div>

        {slikEntities.map((entity, idx) => (
          <EntitySlikCard key={idx} entity={entity} idx={idx} />
        ))}
      </div>{' '}
    </>
  );
}
