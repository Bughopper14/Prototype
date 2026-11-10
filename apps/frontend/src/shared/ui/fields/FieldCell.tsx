/** One field of a Fields grid: label with required star, and the right input for its type. */
import {isFieldMandatory, MasterSelect, useMandatoryRules, useMasterData} from '@/shared/master-data';
import {
  fieldInputError,
  inputLimits,
  label,
  masterGroups,
  masterKey,
  toTitleCase,
  type Field,
} from '@liugong/shared';
import {normalizeBirthDate} from '@/shared/lib/dates';
import {ScanLine} from 'lucide-react';

import {
  AGE_KEYS,
  applyFieldValue,
  DIGITS_ONLY_KEYS,
  LETTERS_ONLY_KEYS,
  onlyKeys,
  TITLE_CASE_KEYS,
} from '@/shared/ui/fields/field-rules';

export function FieldCell({
  f,
  fields,
  value,
  onChange,
  disabled,
  section,
  onSelectOption,
  onFieldFocus,
  activeFieldKey,
  onNibOcr,
  customErrors,
  disableMandatoryRules,
  customFieldHeaders,
  customFieldFooters,
}: {
  f: Field;
  fields: Field[];
  value: any;
  onChange: (v: any) => void;
  disabled: boolean;
  section?: string;
  onSelectOption?: (k: string, v: string) => void;
  onFieldFocus?: (k: string, section?: string) => void;
  activeFieldKey?: string | null;
  onNibOcr?: () => void;
  customErrors?: Record<string, string>;
  disableMandatoryRules: boolean;
  customFieldHeaders?: Record<string, React.ReactNode>;
  customFieldFooters?: Record<string, React.ReactNode>;
}) {
  const master = useMasterData();
  const mandatoryRules = useMandatoryRules();
  const isRequired = disableMandatoryRules
    ? false
    : isFieldMandatory(mandatoryRules, section, f.key, f.required, 'FAP');
  const rawVal = value?.[f.key];
  const isPlaceholderDash = String(rawVal ?? '').trim() === '-';
  const isPlaceholderZip = f.key === 'postalCode' && String(rawVal ?? '').trim() === '00000';
  const cleanVal = isPlaceholderDash || isPlaceholderZip ? '' : (rawVal ?? '');
  // Dates typed or read by OCR as DD-MM-YYYY / "5 Juli 2001" show in the date input too
  const fieldValue =
    f.type === 'date' ? normalizeBirthDate(cleanVal) || String(cleanVal || '').slice(0, 10) : cleanVal;
  const isDigitsOnly = DIGITS_ONLY_KEYS.includes(f.key);
  const isLettersOnly = LETTERS_ONLY_KEYS.includes(f.key);
  const isTitleCaseField = TITLE_CASE_KEYS.includes(f.key);
  const isAgeField = AGE_KEYS.includes(f.key);
  const isFieldDisabled = disabled || isAgeField || !!f.locked;
  const ageStyle = isAgeField
    ? {backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b'}
    : undefined;
  const update = (raw: string) => {
    if (isAgeField) return;
    onChange(applyFieldValue({f, fields, value, raw, master}));
  };
  const fieldError = customErrors?.[f.key] || fieldInputError(f.key, fieldValue);
  const isMaster = f.master !== false && masterGroups.some(g => g.key === masterKey(f.key));
  const handleKeyDown = isDigitsOnly ? onlyKeys('digits') : isLettersOnly ? onlyKeys('letters') : undefined;
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAgeField) return;
    if (isDigitsOnly) {
      let v = e.target.value.replace(/\D/g, '');
      if (['rt', 'rw'].includes(f.key)) v = v.slice(0, 3);
      e.target.value = v;
      update(v);
    } else if (isTitleCaseField) {
      let v = e.target.value;
      if (isLettersOnly) v = v.replace(/\d/g, '');
      v = toTitleCase(v);
      e.target.value = v;
      update(v);
    } else if (isLettersOnly) {
      const v = e.target.value.replace(/\d/g, '');
      e.target.value = v;
      update(v);
    } else {
      update(e.target.value);
    }
  };
  const handlePaste =
    isDigitsOnly || isLettersOnly || isTitleCaseField
      ? (e: React.ClipboardEvent<HTMLInputElement>) => {
          if (isAgeField) return;
          e.preventDefault();
          const rawPasted = e.clipboardData.getData('text') || '';
          let pasted = isDigitsOnly
            ? rawPasted.replace(/\D/g, '')
            : isLettersOnly
              ? rawPasted.replace(/\d/g, '')
              : rawPasted;
          if (isTitleCaseField) pasted = toTitleCase(pasted);
          if (!pasted) return;
          const input = e.currentTarget;
          const start = input.selectionStart ?? 0,
            end = input.selectionEnd ?? 0,
            curr = String(fieldValue);
          let nextVal = curr.slice(0, start) + pasted + curr.slice(end);
          if (isDigitsOnly) nextVal = nextVal.replace(/\D/g, '');
          if (isLettersOnly) nextVal = nextVal.replace(/\d/g, '');
          if (['rt', 'rw'].includes(f.key)) nextVal = nextVal.slice(0, 3);
          if (isTitleCaseField) nextVal = toTitleCase(nextVal);
          input.value = nextVal;
          update(nextVal);
        }
      : undefined;
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isTitleCaseField && e.target.value) {
      const v = toTitleCase(e.target.value);
      if (v !== e.target.value) {
        e.target.value = v;
        update(v);
      }
    }
  };
  return (
    <label
      className={`${f.wide ? 'field-wide' : ''} ${activeFieldKey === f.key ? 'field-active-sync' : ''}`.trim()}
      data-field={f.key}
      onClick={e => {
        e.stopPropagation();
        onFieldFocus?.(f.key, section);
      }}
    >
      <div
        className="field-label-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: 22,
          marginBottom: 4,
          gap: 6,
        }}
      >
        <span
          className="field-label"
          title={toTitleCase(f.label)}
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0,
          }}
        >
          {toTitleCase(f.label)}
          {isRequired && (
            <span className="field-required" aria-label="Required">
              *
            </span>
          )}
        </span>
        <div style={{display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0}}>
          {customFieldHeaders?.[f.key]}
          {f.key === 'nib' && onNibOcr && !disabled && (
            <button
              type="button"
              onClick={onNibOcr}
              title="Upload & Scan Dokumen OSS/NIB · Auto-Fill OCR"
              className="nib-header-ocr-btn"
            >
              <ScanLine size={11} />
              <span>Scan OCR NIB</span>
            </button>
          )}
        </div>
      </div>
      {isMaster ? (
        <MasterSelect
          fieldKey={f.key}
          value={String(fieldValue)}
          record={value || {}}
          disabled={disabled || !!f.locked}
          required={isRequired}
          onFocus={() => {
            if (onFieldFocus) onFieldFocus(f.key, section);
          }}
          onChange={update}
        />
      ) : f.options ? (
        <select
          required={isRequired}
          disabled={disabled || !!f.locked}
          value={String(value?.[f.key] ?? '').toUpperCase() === 'NONE' ? '' : (value?.[f.key] ?? '')}
          onFocus={() => {
            if (onFieldFocus) onFieldFocus(f.key, section);
          }}
          onChange={e => {
            update(e.target.value);
            if (onSelectOption) onSelectOption(f.key, e.target.value);
          }}
        >
          {/* No "None" choice: an empty field shows blank, and a stored NONE reads as empty */}
          <option value="" hidden></option>
          {f.options
            .filter(o => o.toUpperCase() !== 'NONE')
            .map(o => (
              <option key={o} value={o}>
                {f.optionLabels?.[o] ?? toTitleCase(label(o))}
              </option>
            ))}
        </select>
      ) : f.type === 'textarea' ? (
        <textarea
          aria-label={toTitleCase(f.label)}
          required={isRequired}
          disabled={disabled || !!f.locked}
          rows={3}
          value={fieldValue}
          onFocus={() => {
            if (onFieldFocus) onFieldFocus(f.key, section);
          }}
          onBlur={handleBlur}
          onChange={e => {
            const v = isTitleCaseField ? toTitleCase(e.target.value) : e.target.value;
            update(v);
          }}
        />
      ) : f.unit ? (
        <div className="input-with-unit">
          <input
            aria-label={toTitleCase(f.label)}
            required={isRequired}
            disabled={isFieldDisabled}
            readOnly={isAgeField}
            style={ageStyle}
            type={f.type || 'text'}
            inputMode={isDigitsOnly ? 'numeric' : undefined}
            pattern={isDigitsOnly ? '[0-9]*' : undefined}
            maxLength={['rt', 'rw'].includes(f.key) ? 3 : undefined}
            onFocus={() => {
              if (onFieldFocus) onFieldFocus(f.key, section);
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={handleBlur}
            step={f.type === 'number' ? '0.01' : undefined}
            {...inputLimits(f.key)}
            aria-invalid={!!fieldError}
            value={fieldValue}
            onChange={handleInputChange}
          />
          <span>{f.unit}</span>
        </div>
      ) : (
        <input
          aria-label={toTitleCase(f.label)}
          required={isRequired}
          disabled={isFieldDisabled}
          readOnly={isAgeField}
          style={ageStyle}
          type={f.type || 'text'}
          inputMode={isDigitsOnly ? 'numeric' : undefined}
          pattern={isDigitsOnly ? '[0-9]*' : undefined}
          maxLength={['rt', 'rw'].includes(f.key) ? 3 : undefined}
          onFocus={() => {
            if (onFieldFocus) onFieldFocus(f.key, section);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          step={f.type === 'number' ? '0.01' : undefined}
          {...inputLimits(f.key)}
          aria-invalid={!!fieldError}
          value={fieldValue}
          onChange={handleInputChange}
        />
      )}
      {fieldError && (
        <small className="input-validation-error" role="alert" title={fieldError}>
          {fieldError}
        </small>
      )}
      {!fieldError && customFieldFooters?.[f.key]}
    </label>
  );
}
