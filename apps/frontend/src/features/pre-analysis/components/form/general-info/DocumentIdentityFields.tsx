/** Pre-Analysis number and date, customer / project, tax ID and FAP number. */
import {TextField} from '@/features/pre-analysis/components/form/fields/TextField';
import {INPUT_BASE_WHITE, LABEL_BLOCK} from '@/features/pre-analysis/components/form/fields/field-styles';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function DocumentIdentityFields() {
  const {data, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <>
      <TextField
        name="preAnalysisNo"
        label="Pre-Analysis No"
        labelStyle={LABEL_BLOCK}
        inputStyle={INPUT_BASE_WHITE}
        emptyIfMissing
      />
      <TextField
        name="preAnalysisDate"
        label="Pre-Analysis Date"
        labelStyle={LABEL_BLOCK}
        inputStyle={INPUT_BASE_WHITE}
        emptyIfMissing
      />
      <TextField
        name="customerProjectName"
        label="Customer / Project"
        labelStyle={LABEL_BLOCK}
        inputStyle={INPUT_BASE_WHITE}
        emptyIfMissing
        wrapperStyle={{gridColumn: 'span 2'}}
      />
      <TextField
        name="taxId"
        label="Tax ID (NPWP)"
        labelStyle={LABEL_BLOCK}
        inputStyle={INPUT_BASE_WHITE}
        emptyIfMissing
      />
      <div>
        <label
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#475569',
            display: 'block',
            marginBottom: '4px',
          }}
        >
          FAP No
        </label>
        <input
          type="text"
          name="fapNumber"
          data-field="fapNumber"
          className="preana-input-greyed-out"
          value={data.fapNumber}
          readOnly
          tabIndex={-1}
          onFocus={() => scrollToPreviewElement('preana-preview-cell-fapNumber')}
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: '0.8rem',
            borderRadius: '4px',
            border: '1px solid #94a3b8',
            backgroundColor: '#cbd5e1',
            background: '#cbd5e1',
            color: '#1e293b',
            cursor: 'not-allowed',
            fontWeight: 500,
          }}
        />
      </div>
    </>
  );
}
