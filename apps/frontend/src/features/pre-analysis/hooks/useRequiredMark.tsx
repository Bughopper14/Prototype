/** Red asterisk for the fields the mandatory rules of Master Data ask for. */
import {useMandatoryRules, isFieldMandatory} from '@/shared/master-data';

export function useRequiredMark() {
  const mandatoryRules = useMandatoryRules();

  const reqMark = (fieldKey: string, section: string = 'General Information') => {
    const isReq = isFieldMandatory(mandatoryRules, section, fieldKey, false, 'PRE-AN');
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

export type RequiredMarkState = ReturnType<typeof useRequiredMark>;
