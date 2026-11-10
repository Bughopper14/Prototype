/** Shape of one mandatory-field rule and a helper that writes a section's rules without repeating stage and section. */
export interface MandatoryRuleRow {
  id: number;
  stage: string;
  section: string;
  field_key: string;
  field_label: string;
  mandatory: number;
}

/** [id, field key, label, mandatory (1) or optional (0)] */
export type RuleTuple = [number, string, string, 0 | 1];

export const defineRules = (stage: string, section: string, rows: RuleTuple[]): MandatoryRuleRow[] =>
  rows.map(([id, field_key, field_label, mandatory]) => ({
    id,
    stage,
    section,
    field_key,
    field_label,
    mandatory,
  }));
