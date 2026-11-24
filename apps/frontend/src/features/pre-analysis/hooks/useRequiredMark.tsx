/** Red asterisk for the fields the mandatory rules of Master Data ask for. */
import {isFormFieldMandatory, useMandatoryRules} from '@/shared/master-data';

/** The master form of the Pre-Analysis screen (crm_master_forms.code). Its field keys are unique, so a key alone finds its rule. */
const PRE_ANALYSIS_FORM = 'PRE-ANALYSIS-FORM';

export function useRequiredMark() {
  const mandatoryRules = useMandatoryRules();

  const reqMark = (fieldKey: string) => {
    const isReq = isFormFieldMandatory(mandatoryRules, PRE_ANALYSIS_FORM, fieldKey);
    return isReq ? (
      <span
        className="field-required"
        aria-label="Required"
        style={{
          color: '#ef4444',
          fontWeight: 700,
          marginLeft: '4px',
          display: 'inline',
          lineHeight: 1,
          verticalAlign: 'baseline',
        }}
      >
        *
      </span>
    ) : null;
  };

  return {reqMark};
}

