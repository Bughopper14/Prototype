/**
 * TinyMCE rich text editor for Pre-Analysis fields.
 * Formatted and styled identically to CRM / FAP Rich Text Editor (CrmRichTextEditor).
 */
import {CrmRichTextEditor} from '@/shared/ui/CrmRichTextEditor';

export interface PreAnalysisRichEditorProps {
  value: string;
  onChange: (val: string) => void;
  onFocus?: () => void;
  onClick?: () => void;
  placeholder?: string;
  height?: number;
  minHeight?: number;
  dataField?: string;
  disabled?: boolean;
}

export function PreAnalysisRichEditor({
  value,
  onChange,
  onFocus,
  onClick,
  placeholder,
  height = 180,
  minHeight = 160,
  dataField,
  disabled = false,
}: PreAnalysisRichEditorProps) {
  return (
    <CrmRichTextEditor
      id={dataField ? `preana-form-${dataField}` : undefined}
      dataField={dataField}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onClick={onClick}
      placeholder={placeholder}
      height={height}
      minHeight={minHeight}
      disabled={disabled}
      showMenubar={true}
    />
  );
}
