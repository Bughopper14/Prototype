/** Renders a form grid from a Field[] schema: inputs, master selects, dates, OCR buttons, mandatory stars. */
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {normalizeBirthDate} from '@/shared/lib/dates';
import {
  isFieldMandatory,
  MasterSelect,
  resetMasterChildren,
  resolveWilayahUpwards,
  useMandatoryRules,
  useMasterData,
} from '@/shared/master-data';
import {
  fieldInputError,
  inputLimits,
  label,
  masterGroups,
  masterKey,
  toTitleCase,
  type Field,
} from '@liugong/shared';
import {ScanLine} from 'lucide-react';

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
}) {
  const master = useMasterData();
  const mandatoryRules = useMandatoryRules();
  return (
    <div className={`formgrid ${className || ''}`}>
      {fields.map(f => {
        const isRequired = isFieldMandatory(mandatoryRules, section, f.key, f.required, 'FAP');
        const rawVal = value?.[f.key];
        const isPlaceholderDash = String(rawVal ?? '').trim() === '-';
        const isPlaceholderZip = f.key === 'postalCode' && String(rawVal ?? '').trim() === '00000';
        const cleanVal = isPlaceholderDash || isPlaceholderZip ? '' : (rawVal ?? '');
        const fieldValue =
          f.type === 'date'
            ? normalizeBirthDate(cleanVal) || String(cleanVal || '').slice(0, 10)
            : cleanVal;
        const isDigitsOnly = ['phone', 'mobilePhone', 'phoneFax', 'rt', 'rw'].includes(f.key);
        const isLettersOnly = ['repaymentSource'].includes(f.key);
        const isTitleCaseField = [
          'mainBusiness',
          'picName',
          'projectOwner',
          'projectLocation',
          'projectRole',
          'position',
          'repaymentSource',
          'name',
          'firstName',
          'middleName',
          'lastName',
          'occupation',
          'designation',
          'bankOrFinInstitution',
          'paymentRecord',
          'assetName',
          'brand',
          'modelName',
          'purposeDetail',
          'termsNotes',
          'companyAddress',
          'currentAddress',
          'address',
        ].includes(f.key);
        const isAgeField = ['ageYears', 'ageMonths', 'experienceYears', 'experienceMonths'].includes(f.key);
        const isFieldDisabled = disabled || isAgeField || !!f.locked;
        const ageStyle = isAgeField
          ? {backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b'}
          : undefined;
        const update = (raw: string) => {
          if (isAgeField) return;
          const clean = isDigitsOnly ? raw.replace(/\D/g, '') : isLettersOnly ? raw.replace(/\d/g, '') : raw;
          const sanitized = ['rt', 'rw'].includes(f.key) ? clean.slice(0, 3) : clean;
          // master: false = free text (e.g. a foreign address): no cascading reset or wilayah lookup
          const masterLinked = f.master !== false;
          const changed = {
            ...value,
            [f.key]: f.type === 'number' ? sanitized : f.type === 'date' ? sanitized || null : sanitized,
          };
          let next = masterLinked
            ? resetMasterChildren(
                f.key,
                changed,
                fields.map(x => x.key),
              )
            : changed;
          if (masterLinked && f.key === 'village' && fields.some(x => x.key === 'postalCode'))
            next.postalCode = master.village.find(x => x.value === sanitized)?.zipCode || '';
          if (f.key === 'dateOfBirth' && fields.some(x => x.key === 'ageYears' || x.key === 'ageMonths')) {
            const {years, months} = calculateAgeYearsMonths(sanitized);
            next.ageYears = years;
            next.ageMonths = months;
          }
          if (masterLinked && ['district', 'village', 'postalCode'].includes(f.key)) {
            next = resolveWilayahUpwards(next, master);
          }
          onChange(next);
        };
        const fieldError = customErrors?.[f.key] || fieldInputError(f.key, fieldValue);
        const isMaster = f.master !== false && masterGroups.some(g => g.key === masterKey(f.key));
        // Grey hint inside empty fields; gone as soon as the user types or picks something
        const placeholderText = `${f.options || isMaster ? 'Select' : 'Enter'} ${toTitleCase(f.label)}`;
        const handleKeyDown = isDigitsOnly
          ? (e: React.KeyboardEvent<HTMLInputElement>) => {
              if (
                e.ctrlKey ||
                e.metaKey ||
                [
                  'Backspace',
                  'Tab',
                  'Enter',
                  'Escape',
                  'ArrowLeft',
                  'ArrowRight',
                  'ArrowUp',
                  'ArrowDown',
                  'Delete',
                  'Home',
                  'End',
                ].includes(e.key)
              )
                return;
              if (!/^\d$/.test(e.key)) e.preventDefault();
            }
          : isLettersOnly
            ? (e: React.KeyboardEvent<HTMLInputElement>) => {
                if (
                  e.ctrlKey ||
                  e.metaKey ||
                  [
                    'Backspace',
                    'Tab',
                    'Enter',
                    'Escape',
                    'ArrowLeft',
                    'ArrowRight',
                    'ArrowUp',
                    'ArrowDown',
                    'Delete',
                    'Home',
                    'End',
                  ].includes(e.key)
                )
                  return;
                if (/^\d$/.test(e.key)) e.preventDefault();
              }
            : undefined;
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
            key={f.key}
            className={`${f.wide ? 'field-wide' : ''} ${activeFieldKey === f.key ? 'field-active-sync' : ''}`.trim()}
            onClick={() => onFieldFocus?.(f.key, section)}
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
                className={value?.[f.key] === '' || value?.[f.key] === 'NONE' ? 'is-placeholder' : undefined}
                required={isRequired}
                disabled={disabled || !!f.locked}
                value={value?.[f.key] ?? (f.options.includes('NONE') ? 'NONE' : '')}
                onFocus={() => {
                  if (onFieldFocus) onFieldFocus(f.key, section);
                }}
                onChange={e => {
                  update(e.target.value);
                  if (onSelectOption) onSelectOption(f.key, e.target.value);
                }}
              >
                {!f.options.some(o => o.toUpperCase() === 'NONE') && (
                  <option value="">None</option>
                )}
                {f.options.map(o => (
                  <option key={o} value={o}>
                    {f.optionLabels?.[o] ?? (o.toUpperCase() === 'NONE' ? 'None' : toTitleCase(label(o)))}
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
                placeholder={placeholderText}
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
                placeholder={f.type === 'date' ? undefined : placeholderText}
                onChange={handleInputChange}
              />
            )}
            {fieldError && (
              <small className="input-validation-error" role="alert" title={fieldError}>
                {fieldError}
              </small>
            )}
          </label>
        );
      })}
    </div>
  );
}
