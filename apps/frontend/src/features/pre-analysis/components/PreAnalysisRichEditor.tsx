/** TinyMCE editor used by every pre-analysis rich-text field. */
import {getStaticAssetUrl} from '@/features/pre-analysis/lib/text';
import {Editor} from '@tinymce/tinymce-react';
import {useMemo, useRef} from 'react';

export function PreAnalysisRichEditor({
  value,
  onChange,
  onFocus,
  placeholder,
  height = 160,
  dataField,
}: {
  value: string;
  onChange: (val: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  height?: number;
  dataField?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tinymceSrc = getStaticAssetUrl('tinymce/tinymce.min.js');

  const triggerEditorFocus = () => {
    if (wrapperRef.current) {
      wrapperRef.current.classList.remove('fap-preview-sync-highlight');
      void wrapperRef.current.offsetWidth;
      wrapperRef.current.classList.add('fap-preview-sync-highlight');
      setTimeout(() => {
        wrapperRef.current?.classList.remove('fap-preview-sync-highlight');
      }, 2500);
    }
    if (onFocus) {
      onFocus();
    }
  };

  const initialHtml = useMemo(() => {
    if (!value) return '';
    if (
      value.includes('<p>') ||
      value.includes('<div>') ||
      value.includes('<ul>') ||
      value.includes('<ol>')
    ) {
      return value;
    }
    return value
      .split('\n')
      .map(l => (l.trim() ? `<p>${l}</p>` : '<p>&nbsp;</p>'))
      .join('');
  }, []);

  return (
    <div
      ref={wrapperRef}
      id={dataField ? `preana-form-${dataField}` : undefined}
      data-field={dataField}
      className="preana-rich-editor-wrapper"
      onClick={() => triggerEditorFocus()}
      onFocus={() => triggerEditorFocus()}
      style={{
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid #cbd5e1',
        background: '#ffffff',
        transition: 'all 0.2s ease',
      }}
    >
      <style>{`
        .preana-rich-editor-wrapper .tox.tox-tinymce {
          border: none !important;
          border-radius: 6px !important;
        }
        .preana-rich-editor-wrapper .tox .tox-editor-header {
          display: flex !important;
          flex-direction: column !important;
          width: 100% !important;
          box-shadow: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
          padding: 0 !important;
          background: #f8fafc !important;
        }
        .preana-rich-editor-wrapper .tox .tox-menubar {
          display: flex !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          width: 100% !important;
          height: 24px !important;
          min-height: 24px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          background: #f8fafc !important;
          padding: 0 4px !important;
          overflow-x: auto !important;
        }
        .preana-rich-editor-wrapper .tox .tox-mbtn {
          height: 20px !important;
          min-height: 20px !important;
          padding: 0 5px !important;
          margin: 1px 0 !important;
          font-size: 11px !important;
          color: #475569 !important;
          border-radius: 3px !important;
          cursor: pointer !important;
        }
        .preana-rich-editor-wrapper .tox .tox-mbtn:hover {
          background: #e2e8f0 !important;
          color: #0f172a !important;
        }
        .preana-rich-editor-wrapper .tox .tox-toolbar-overlord {
          width: 100% !important;
          background: #ffffff !important;
        }
        .preana-rich-editor-wrapper .tox .tox-toolbar,
        .preana-rich-editor-wrapper .tox .tox-toolbar__primary {
          width: 100% !important;
          display: flex !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          height: 28px !important;
          min-height: 28px !important;
          max-height: 28px !important;
          padding: 1px 4px !important;
          background: #ffffff !important;
          overflow-x: auto !important;
          scrollbar-width: thin !important;
        }
        .preana-rich-editor-wrapper .tox .tox-toolbar__group {
          display: inline-flex !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          height: 24px !important;
          min-height: 24px !important;
          padding: 0 2px !important;
          margin: 0 !important;
          border-right: 1px solid #f1f5f9 !important;
        }
        .preana-rich-editor-wrapper .tox .tox-toolbar__group:last-child {
          border-right: none !important;
        }
        .preana-rich-editor-wrapper .tox .tox-tbtn {
          height: 22px !important;
          min-height: 22px !important;
          width: 24px !important;
          min-width: 24px !important;
          margin: 0 1px !important;
          padding: 0 !important;
          border-radius: 3px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
        }
        .preana-rich-editor-wrapper .tox .tox-tbtn svg {
          width: 14px !important;
          height: 14px !important;
          fill: #475569 !important;
        }
        .preana-rich-editor-wrapper .tox .tox-tbtn:hover {
          background: #f1f5f9 !important;
          color: #0f172a !important;
        }
        .preana-rich-editor-wrapper .tox .tox-tbtn--select {
          height: 22px !important;
          min-height: 22px !important;
          width: auto !important;
          min-width: 68px !important;
          padding: 0 4px !important;
          font-size: 11px !important;
          margin: 0 1px !important;
        }
        .preana-rich-editor-wrapper .tox .tox-tbtn__select-label {
          font-size: 11px !important;
          line-height: 22px !important;
          font-weight: 500 !important;
          color: #334155 !important;
        }
        .preana-rich-editor-wrapper .tox .tox-split-button {
          height: 22px !important;
          min-height: 22px !important;
          margin: 0 1px !important;
        }
        .preana-rich-editor-wrapper .tox .tox-split-button .tox-tbtn {
          height: 22px !important;
          min-height: 22px !important;
        }
        .preana-rich-editor-wrapper .tox .tox-edit-area {
          border-top: none !important;
        }
        .preana-rich-editor-wrapper .tox .tox-edit-area__iframe {
          background: #ffffff !important;
        }
        .preana-rich-editor-wrapper .tox .tox-statusbar {
          border-top: 1px solid #f1f5f9 !important;
          height: 22px !important;
          min-height: 22px !important;
          padding: 0 8px !important;
          background: #f8fafc !important;
          font-size: 11px !important;
          color: #94a3b8 !important;
        }
        .preana-rich-editor-wrapper .tox .tox-statusbar__path { display: none !important; }
        .preana-rich-editor-wrapper .tox-statusbar__path { display: none !important; }
        .preana-rich-editor-wrapper .tox-statusbar__path-item { display: none !important; }
      `}</style>
      <Editor
        licenseKey="gpl"
        tinymceScriptSrc={tinymceSrc}
        value={value || ''}
        initialValue={initialHtml}
        onEditorChange={newHtml => {
          if (newHtml !== value) {
            onChange(newHtml);
          }
        }}
        init={{
          height: Math.max(height + 100, 260),
          min_height: 240,
          menubar: 'file edit insert view format table tools',
          menu: {
            file: {title: 'File', items: 'newdocument | preview | print'},
            edit: {title: 'Edit', items: 'undo redo | cut copy paste pastetext | selectall | searchreplace'},
            insert: {title: 'Insert', items: 'image link table | hr charmap emoticons | insertdatetime'},
            view: {title: 'View', items: 'visualaid visualblocks | code | fullscreen'},
            format: {
              title: 'Format',
              items:
                'bold italic underline strikethrough superscript subscript | styles blocks fontfamily fontsize | forecolor backcolor | align lineheight | removeformat',
            },
            table: {title: 'Table', items: 'inserttable | cell row column | tableprops deletetable'},
            tools: {title: 'Tools', items: 'wordcount'},
          },
          block_formats:
            'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Preformatted=pre; Blockquote=blockquote',
          placeholder: placeholder,
          branding: false,
          elementpath: false,
          toolbar_mode: 'floating',
          plugins: [
            'advlist',
            'autolink',
            'lists',
            'link',
            'image',
            'charmap',
            'emoticons',
            'searchreplace',
            'visualblocks',
            'code',
            'fullscreen',
            'preview',
            'insertdatetime',
            'table',
            'wordcount',
          ],
          toolbar:
            'undo redo | blocks | bold italic underline forecolor | align | bullist numlist | link image table | code fullscreen',
          image_title: true,
          automatic_uploads: true,
          file_picker_types: 'image',
          file_picker_callback: (callback: (url: string, meta?: any) => void) => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/png, image/jpeg, image/jpg, image/webp, image/svg+xml');
            input.onchange = function () {
              const file = (this as HTMLInputElement).files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = function () {
                  callback(reader.result as string, {title: file.name, alt: file.name});
                };
                reader.readAsDataURL(file);
              }
            };
            input.click();
          },
          paste_data_images: true,
          images_upload_handler: (blobInfo: any) =>
            new Promise((resolve, reject) => {
              try {
                const base64 = 'data:' + blobInfo.blob().type + ';base64,' + blobInfo.base64();
                resolve(base64);
              } catch (e: any) {
                reject(e?.message || 'Failed to upload image');
              }
            }),
          setup: (editor: any) => {
            let userReady = false;
            editor.on('init', () => {
              setTimeout(() => {
                userReady = true;
              }, 300);
            });
            editor.on('focus', () => {
              if (userReady) triggerEditorFocus();
            });
            editor.on('click', () => {
              triggerEditorFocus();
            });
            editor.on('mousedown', () => {
              triggerEditorFocus();
            });
          },
          content_style: `
            body { 
              font-family: 'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              font-size: 13px; 
              line-height: 1.5; 
              color: #0f172a; 
              padding: 8px 12px; 
            }
            ol, ul {
              margin: 0 0 6px 0;
              padding-left: 20px;
            }
            li {
              margin-bottom: 3px;
              line-height: 1.5;
            }
            p {
              margin: 0 0 5px 0;
            }
          `,
        }}
      />
    </div>
  );
}
