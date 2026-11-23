/** The red asterisk of a field that the workflow's mandatory rules ask for (the same rules the FAP form fields use). */
import {isFieldMandatory, useMandatoryRules} from '@/shared/master-data';

export function RequiredStar({field, section, stage = 'FAP'}: {field: string; section: string; stage?: string}) {
  const rules = useMandatoryRules();
  if (!isFieldMandatory(rules, section, field, false, stage)) return null;
  return (
    <span className="field-required" aria-label="Required" style={{color: '#ef4444', fontWeight: 700, marginLeft: 4}}>
      *
    </span>
  );
}
