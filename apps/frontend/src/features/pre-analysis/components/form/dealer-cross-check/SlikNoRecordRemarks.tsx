/** Remarks / reason shown when the entity has no SLIK records. */
import {PreAnalysisRichEditor} from '@/features/pre-analysis/components/PreAnalysisRichEditor';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';
import type {EntitySlikReview} from '@/features/pre-analysis/lib/types';

export function SlikNoRecordRemarks({idx, review}: {idx: number; review: EntitySlikReview}) {
  const {updateEntityReview, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    /* NO: Show Remarks column with TinyMCE */
    <div>
      <label
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#475569',
          marginBottom: '4px',
          display: 'block',
        }}
      >
        Remarks / Reason for No SLIK Records
      </label>
      <PreAnalysisRichEditor
        value={review.noRecordRemarks || ''}
        onChange={val => updateEntityReview(idx, {noRecordRemarks: val})}
        onFocus={() => scrollToPreviewElement(`preana-preview-cell-slik-${idx}`)}
        dataField={`slik-${idx}-noRecordRemarks`}
        height={140}
      />
    </div>
  );
}
