/** SLIK / bureau review of one group entity. */
import {SlikEntityHeader} from '@/features/pre-analysis/components/form/dealer-cross-check/SlikEntityHeader';
import {SlikRecordDetails} from '@/features/pre-analysis/components/form/dealer-cross-check/SlikRecordDetails';
import {SlikNoRecordRemarks} from '@/features/pre-analysis/components/form/dealer-cross-check/SlikNoRecordRemarks';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';
import type {PreAnalysisState} from '@/features/pre-analysis/hooks/usePreAnalysisState';

export function EntitySlikCard({
  entity,
  idx,
}: {
  entity: PreAnalysisState['slikEntities'][number];
  idx: number;
}) {
  const {getEntityReview, getGrandTotal} = usePreAnalysisContext();

  const fullEntityName = entity.name || `Entity #${idx + 1}`;

  const review = getEntityReview(idx, fullEntityName);

  const totalPlafonFormatted = getGrandTotal(review.lenderExposures);

  const projectTypeLabel =
    entity.projectType === 'current'
      ? 'Current Project'
      : entity.projectType === 'history'
        ? 'History Project'
        : 'Investment Project Plan';

  return (
    <div
      id={`preana-form-entity-${idx}`}
      data-field={`slik-${idx}`}
      tabIndex={-1}
      style={{
        marginTop: idx > 0 ? '14px' : '6px',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '14px',
        background: review.hasRecord ? '#ffffff' : '#f8fafc',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <SlikEntityHeader
        entity={entity}
        idx={idx}
        fullEntityName={fullEntityName}
        review={review}
        projectTypeLabel={projectTypeLabel}
      />

      {review.hasRecord ? (
        <SlikRecordDetails idx={idx} review={review} totalPlafonFormatted={totalPlafonFormatted} />
      ) : (
        <SlikNoRecordRemarks idx={idx} review={review} />
      )}
    </div>
  );
}
