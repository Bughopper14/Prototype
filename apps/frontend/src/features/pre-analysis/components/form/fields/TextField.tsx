/** A labelled single-line text field bound to one key of the Pre-Analysis data; focusing it scrolls the document to the matching cell. */
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';
import {INPUT_BASE, LABEL_PLAIN} from '@/features/pre-analysis/components/form/fields/field-styles';
import type {PreAnalysisData} from '@/features/pre-analysis/lib/types';
import type {CSSProperties} from 'react';

export function TextField({
  name,
  label,
  labelStyle = LABEL_PLAIN,
  inputStyle = INPUT_BASE,
  wrapperStyle,
  required,
  emptyIfMissing = false,
}: {
  name: keyof PreAnalysisData & string;
  label: string;
  labelStyle?: CSSProperties;
  inputStyle?: CSSProperties;
  wrapperStyle?: CSSProperties;
  /** [field key, section] looked up in the mandatory rules; shows the red asterisk when required. */
  required?: [string, string];
  /** Show an empty string instead of leaving the input uncontrolled when the value is missing. */
  emptyIfMissing?: boolean;
}) {
  const {data, updateField, scrollToPreviewElement, reqMark} = usePreAnalysisContext();
  const value = data[name] as string;
  return (
    <div style={wrapperStyle}>
      <label style={labelStyle}>
        {label}
        {required && reqMark(required[0], required[1])}
      </label>
      <input
        type="text"
        name={name}
        data-field={name}
        value={emptyIfMissing ? value || '' : value}
        onChange={e => updateField(name, e.target.value)}
        onFocus={() => scrollToPreviewElement('preana-preview-cell-' + name)}
        style={inputStyle}
      />
    </div>
  );
}
