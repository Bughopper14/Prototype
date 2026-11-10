/** Rich-text editor for deed remarks (the shared CRM editor, with menubar). */
import {CrmRichTextEditor} from '@/shared/ui/CrmRichTextEditor';

export function DeedRemarksTinyMCE({
  initialContent,
  disabled,
  onChange,
}: {
  initialContent: string;
  disabled: boolean;
  onChange: (html: string) => void;
}) {
  return (
    <div className="legal-tinymce-wrapper">
      <CrmRichTextEditor
        value={initialContent}
        onChange={onChange}
        disabled={disabled}
        showMenubar
        height={260}
      />
    </div>
  );
}
