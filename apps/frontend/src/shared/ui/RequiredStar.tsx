/** The red asterisk of a field that the workflow's mandatory rules ask for. `section` is the code of its master form section (FORM_SECTION). */
import {isFieldMandatory, useMandatoryRules} from '@/shared/master-data';

export function RequiredStar({field, section}: {field: string; section: string}) {
  const rules = useMandatoryRules();
  if (!isFieldMandatory(rules, section, field)) return null;
  return (
    <span className="field-required" aria-label="Required" style={{color: '#ef4444', fontWeight: 700, marginLeft: 4}}>
      *
    </span>
  );
}
