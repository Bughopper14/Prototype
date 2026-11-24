/** Renders a form grid from a Field[] schema: inputs, master selects, dates, OCR buttons, mandatory stars. */
import {FieldCell} from '@/shared/ui/fields/FieldCell';
import type {Field} from '@liugong/shared';

export function Fields({
  fields,
  value,
  onChange,
  disabled = false,
  className,
  section,
  ruleSection,
  onSelectOption,
  onFieldFocus,
  activeFieldKey,
  onNibOcr,
  onNpwpOcr,
  customErrors,
  disableMandatoryRules = false,
  customFieldHeaders,
  customFieldFooters,
}: {
  fields: Field[];
  value: any;
  onChange: (v: any) => void;
  disabled?: boolean;
  className?: string;
  section?: string;
  /** crm_master_form_sections.code of the section: which mandatory rules apply (the red star). */
  ruleSection?: string;
  onSelectOption?: (k: string, v: string) => void;
  onFieldFocus?: (k: string, section?: string) => void;
  activeFieldKey?: string | null;
  onNibOcr?: () => void;
  onNpwpOcr?: () => void;
  customErrors?: Record<string, string>;
  /** Ignore Master Data mandatory rules (a form that has its own required checks). */
  disableMandatoryRules?: boolean;
  /** Extra element shown next to a field's label, by field key (e.g. a running total). */
  customFieldHeaders?: Record<string, React.ReactNode>;
  /** Hint shown under a field when it has no error, by field key. */
  customFieldFooters?: Record<string, React.ReactNode>;
}) {
  return (
    <div className={`formgrid ${className || ''}`}>
      {fields.map(f => (
        <FieldCell
          key={f.key}
          f={f}
          fields={fields}
          value={value}
          onChange={onChange}
          disabled={disabled}
          section={section}
          ruleSection={ruleSection}
          onSelectOption={onSelectOption}
          onFieldFocus={onFieldFocus}
          activeFieldKey={activeFieldKey}
          onNibOcr={onNibOcr}
          onNpwpOcr={onNpwpOcr}
          customErrors={customErrors}
          disableMandatoryRules={disableMandatoryRules}
          customFieldHeaders={customFieldHeaders}
          customFieldFooters={customFieldFooters}
        />
      ))}
    </div>
  );
}
