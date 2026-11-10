/** Equity, paid-up capital and source of repayment. */
import {TextField} from '@/features/pre-analysis/components/form/fields/TextField';
import {LABEL_INLINE_FLEX} from '@/features/pre-analysis/components/form/fields/field-styles';
import {stripHtmlTags} from '@/features/pre-analysis/lib/text';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function FinancialStandingFields() {
  const {data, updateField, scrollToPreviewElement, reqMark} = usePreAnalysisContext();
  return (
    <>
      <TextField
        name="equity"
        label="Equity"
        labelStyle={LABEL_INLINE_FLEX}
        wrapperStyle={{gridColumn: 'span 2'}}
      />
      <TextField name="paidUpCapital" label="Paid up Capital" labelStyle={LABEL_INLINE_FLEX} />
      <div>
        <label
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#475569',
            display: 'inline-flex',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          Source of Repayment{reqMark('sourceOfRepayment', 'General Information')}
        </label>
        <input
          type="text"
          name="sourceOfRepayment"
          data-field="sourceOfRepayment"
          value={stripHtmlTags(data.sourceOfRepayment)}
          onChange={e => updateField('sourceOfRepayment', e.target.value)}
          onFocus={() => scrollToPreviewElement('preana-preview-cell-sourceOfRepayment')}
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: '0.8rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
          }}
        />
      </div>
    </>
  );
}
