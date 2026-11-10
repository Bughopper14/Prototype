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
  onSelectOption,
  onFieldFocus,
  onFieldSync,
  activeFieldKey,
  onNibOcr,
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
  onSelectOption?: (k: string, v: string) => void;
  onFieldFocus?: (k: string, section?: string) => void;
  onFieldSync?: (k: string, section?: string) => void;
  activeFieldKey?: string | null;
  onNibOcr?: () => void;
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
          onSelectOption={onSelectOption}
          onFieldFocus={onFieldFocus}
          activeFieldKey={activeFieldKey}
          onNibOcr={onNibOcr}
          customErrors={customErrors}
          disableMandatoryRules={disableMandatoryRules}
          customFieldHeaders={customFieldHeaders}
          customFieldFooters={customFieldFooters}
        />
      ))}
    </div>
  );
}
