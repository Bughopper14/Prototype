import {inputLimits, fieldInputError} from '@/lib/shared/input-validation';
import {useState, useRef, type ReactNode} from 'react';
import {
  ScanLine,
  ArrowRight,
  ArrowLeft,
  Plus,
  Activity,
  ChevronRight,
  ChevronLeft,
  X,
  Upload,
  Trash2,
} from 'lucide-react';
import {
  MasterSelect,
  useMasterData,
  resetMasterChildren,
  useMandatoryRules,
  isFieldMandatory,
  resolveWilayahUpwards,
} from '@/components/crm/master-data/MasterData';
import {masterGroups, masterKey} from '@/lib/shared/master-catalog';
import {type Field, blank, label, toTitleCase} from '@/lib/shared/fields';
import {statusLabel, date, calculateAgeYearsMonths} from '@/lib/client/format';

export function Badge({status}: {status: string}) {
  return (
    <span className={'badge ' + status?.toLowerCase()}>
      <i />
      {statusLabel[status] || label(status)}
    </span>
  );
}

export function IconBox({children}: {children: ReactNode}) {
  return <span className="iconbox">{children}</span>;
}

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
        const fieldValue = f.type === 'date' ? String(cleanVal || '').slice(0, 10) : cleanVal;
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
        const isFieldDisabled = disabled || isAgeField;
        const ageStyle = isAgeField
          ? {backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b'}
          : undefined;
        const update = (raw: string) => {
          if (isAgeField) return;
          const clean = isDigitsOnly ? raw.replace(/\D/g, '') : isLettersOnly ? raw.replace(/\d/g, '') : raw;
          const sanitized = ['rt', 'rw'].includes(f.key) ? clean.slice(0, 3) : clean;
          let next = resetMasterChildren(
            f.key,
            {
              ...value,
              [f.key]: f.type === 'number' ? sanitized : f.type === 'date' ? sanitized || null : sanitized,
            },
            fields.map(x => x.key),
          );
          if (f.key === 'village' && fields.some(x => x.key === 'postalCode'))
            next.postalCode = master.village.find(x => x.value === sanitized)?.zipCode || '';
          if (f.key === 'dateOfBirth' && fields.some(x => x.key === 'ageYears' || x.key === 'ageMonths')) {
            const {years, months} = calculateAgeYearsMonths(sanitized);
            next.ageYears = years;
            next.ageMonths = months;
          }
          if (['district', 'village', 'postalCode'].includes(f.key)) {
            next = resolveWilayahUpwards(next, master);
          }
          onChange(next);
        };
        const fieldError = customErrors?.[f.key] || fieldInputError(f.key, fieldValue);
        const isMaster = masterGroups.some(g => g.key === masterKey(f.key));
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
                disabled={disabled}
                required={isRequired}
                onFocus={() => {
                  if (onFieldFocus) onFieldFocus(f.key, section);
                }}
                onChange={update}
              />
            ) : f.options ? (
              <select
                required={isRequired}
                disabled={disabled}
                value={value?.[f.key] ?? f.options[0]}
                onFocus={() => {
                  if (onFieldFocus) onFieldFocus(f.key, section);
                }}
                onChange={e => {
                  update(e.target.value);
                  if (onSelectOption) onSelectOption(f.key, e.target.value);
                }}
              >
                {f.options.map(o => (
                  <option key={o} value={o}>
                    {f.optionLabels?.[o] ?? toTitleCase(label(o))}
                  </option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                aria-label={toTitleCase(f.label)}
                required={isRequired}
                disabled={disabled}
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
          </label>
        );
      })}
    </div>
  );
}

export function Repeater({
  title,
  fields,
  rows,
  onChange,
  disabled = false,
  description,
  carousel = false,
  section,
  onFieldFocus,
  onFieldSync,
  activeFieldKey,
}: {
  title: string;
  fields: Field[];
  rows: any[];
  onChange: (v: any[]) => void;
  disabled?: boolean;
  description?: string;
  carousel?: boolean;
  section?: string;
  onFieldFocus?: (k: string, section?: string) => void;
  onFieldSync?: (k: string, section?: string) => void;
  activeFieldKey?: string | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndex = Math.min(activeIndex, Math.max(rows.length - 1, 0));
  const addRow = () => {
    onChange([...rows, blank(fields)]);
    setActiveIndex(rows.length);
  };
  const removeRow = (index: number) => {
    onChange(rows.filter((_, j) => j !== index));
    setActiveIndex(Math.min(currentIndex, Math.max(rows.length - 2, 0)));
  };
  return (
    <>
      <div className="section-title">
        <div>
          <h3>{toTitleCase(title)}</h3>
          {description && <p className="muted repeater-description">{description}</p>}
        </div>
        {!disabled && (
          <button className="button small" onClick={addRow}>
            <Plus size={15} />
            Add {title.toLowerCase() === 'equipment units' ? 'unit' : 'row'}
          </button>
        )}
      </div>
      {carousel && rows.length > 0 && (
        <div className="repeater-carousel-controls">
          <button
            className="button small"
            disabled={currentIndex === 0}
            onClick={() => setActiveIndex(i => Math.max(i - 1, 0))}
          >
            <ChevronLeft size={15} />
            Previous
          </button>
          <span>
            {currentIndex + 1} of {rows.length}
          </span>
          <button
            className="button small"
            disabled={currentIndex >= rows.length - 1}
            onClick={() => setActiveIndex(i => Math.min(i + 1, rows.length - 1))}
          >
            Next
            <ChevronRight size={15} />
          </button>
        </div>
      )}
      {rows.length === 0 && <div className="empty-small">No entries yet.</div>}
      {(carousel ? rows.slice(currentIndex, currentIndex + 1) : rows).map((r, i) => {
        const rowIndex = carousel ? currentIndex : i;
        return (
          <div className="repeat" key={rowIndex}>
            <div className="repeat-top">
              <span>
                {toTitleCase(title)} / {String(rowIndex + 1).padStart(2, '0')}
              </span>
              {!disabled && (
                <button
                  className="icon-button danger"
                  aria-label="Remove row"
                  onClick={() => removeRow(rowIndex)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <Fields
              fields={fields}
              value={r}
              disabled={disabled}
              section={section || title.toLowerCase()}
              onFieldFocus={onFieldFocus}
              onFieldSync={onFieldSync}
              activeFieldKey={activeFieldKey}
              onChange={v => onChange(rows.map((x, j) => (rowIndex === j ? v : x)))}
            />
          </div>
        );
      })}
    </>
  );
}

export function Modal({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div
      className="modal-scrim"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        L<span>G</span>
      </div>
      <div>
        <strong>LIUGONG</strong>
        <small>FINANCE INDONESIA</small>
      </div>
    </div>
  );
}

export function Audit({logs}: {logs: any[]}) {
  return (
    <div className="audit-list">
      {logs.map(l => (
        <div className="audit-item" key={l.id}>
          <span className="audit-icon">
            <Activity size={16} />
          </span>
          <div>
            <b>{l.actionBy}</b>
            <span className="audit-role">{l.userRole}</span>
            <p>{l.comments}</p>
            <small>
              {statusLabel[l.previousStatus]} <ArrowRight size={12} /> {statusLabel[l.newStatus]}{' '}
              <span>·</span> {new Date(l.actionTimestamp).toLocaleString('en-GB')}
            </small>
          </div>
        </div>
      ))}
      {!logs.length && <div className="empty-small">No activity yet.</div>}
    </div>
  );
}
// legacy ActivityPage replaced by Enhanced ActivityPage component from ActivityAndNotificationsView

export function AutoNumberedTextarea({
  value,
  onChange,
  disabled,
  rows = 3,
  placeholder,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const target = e.currentTarget,
        pos = target.selectionStart,
        val = target.value;
      const lineStart = val.lastIndexOf('\n', pos - 1) + 1,
        currentLine = val.slice(lineStart, pos);
      const match = currentLine.match(/^(\s*)(\d+)\.\s*(.*)$/);
      if (match) {
        e.preventDefault();
        const indent = match[1],
          num = parseInt(match[2], 10),
          rest = match[3];
        if (rest.trim() === '') {
          const nextVal = val.slice(0, lineStart) + val.slice(pos);
          onChange(nextVal);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = lineStart;
            }
          }, 0);
        } else {
          const insertText = '\n' + indent + (num + 1) + '. ';
          const nextVal = val.slice(0, pos) + insertText + val.slice(target.selectionEnd);
          onChange(nextVal);
          const newPos = pos + insertText.length;
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
            }
          }, 0);
        }
      } else {
        e.preventDefault();
        const lineCount = val.slice(0, pos).split('\n').length;
        const insertText = '\n' + (lineCount + 1) + '. ';
        const nextVal = val.slice(0, pos) + insertText + val.slice(target.selectionEnd);
        onChange(nextVal);
        const newPos = pos + insertText.length;
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
          }
        }, 0);
      }
    }
  };
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let raw = e.target.value;
    if (raw.length > 0 && !/^\s*\d+\./.test(raw)) {
      raw = '1. ' + raw.replace(/^1\.\s*/, '');
    }
    onChange(raw);
  };
  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (!value || value.trim() === '') {
      onChange('1. ');
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = 3;
        }
      }, 0);
    }
  };
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasteText = e.clipboardData.getData('text');
    if (pasteText && pasteText.includes('\n')) {
      e.preventDefault();
      const target = e.currentTarget,
        pos = target.selectionStart,
        end = target.selectionEnd,
        val = target.value;
      const lineStart = val.lastIndexOf('\n', pos - 1) + 1,
        currentLine = val.slice(lineStart, pos);
      const match = currentLine.match(/^(\s*)(\d+)\.\s*(.*)$/);
      let startNum = match ? parseInt(match[2], 10) : 1;
      const lines = pasteText.split('\n');
      const formattedLines = lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (/^\s*\d+\.\s*/.test(trimmed)) return trimmed;
        return `${startNum + idx}. ${trimmed}`;
      });
      const insertText = formattedLines.join('\n');
      const nextVal = val.slice(0, pos) + insertText + val.slice(end);
      onChange(nextVal);
      const newPos = pos + insertText.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
        }
      }, 0);
    }
  };
  return (
    <textarea
      ref={textareaRef}
      aria-label={ariaLabel}
      rows={rows}
      disabled={disabled}
      className={className}
      value={value || ''}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onPaste={handlePaste}
      placeholder={placeholder}
    />
  );
}
