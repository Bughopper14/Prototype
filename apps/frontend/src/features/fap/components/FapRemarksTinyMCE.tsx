import {Editor} from '@tinymce/tinymce-react';
import {useState} from 'react';

export function FapRemarksTinyMCE({
  initialContent,
  disabled,
  onChange,
}: {
  initialContent: string;
  disabled?: boolean;
  onChange: (html: string) => void;
}) {
  const [initialValue] = useState(() => initialContent);

  return (
    <div className="legal-tinymce-wrapper" style={{width: '100%'}}>
      <Editor
        licenseKey="gpl"
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        initialValue={initialValue}
        disabled={disabled}
        onEditorChange={onChange}
        init={{
          height: 220,
          menubar: false,
          plugins: [
            'advlist',
            'autolink',
            'lists',
            'link',
            'charmap',
            'searchreplace',
            'visualblocks',
            'code',
            'fullscreen',
            'insertdatetime',
            'table',
            'help',
            'wordcount',
          ],
          toolbar:
            'undo redo | blocks | bold italic underline forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
          content_style: `
            body { 
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              font-size: 13px; 
              line-height: 1.6; 
              color: #0f172a; 
              padding: 10px 14px; 
            }
            ol {
              margin: 0 0 8px 0;
              padding-left: 24px;
              list-style-type: decimal !important;
            }
            ol li {
              margin-bottom: 4px;
              line-height: 1.6;
            }
            ul {
              margin: 0 0 8px 0;
              padding-left: 24px;
              list-style-type: disc !important;
            }
            ul li {
              margin-bottom: 4px;
              line-height: 1.6;
            }
            p {
              margin: 0 0 6px 0;
              line-height: 1.6;
            }
          `,
          branding: false,
          promotion: false,
          statusbar: true,
          setup: (ed: any) => {
            ed.on('init', () => {
              if (!disabled) {
                ed.mode.set('design');
              }
            });
          },
        }}
      />
    </div>
  );
}
