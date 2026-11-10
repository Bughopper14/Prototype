import {getStaticAssetUrl} from '@/features/pre-analysis/lib/text';
import {Editor} from '@tinymce/tinymce-react';
import React, {useMemo, useRef} from 'react';

export interface CrmRichTextEditorProps {
  value?: string;
  onChange: (val: string) => void;
  onFocus?: () => void;
  onClick?: () => void;
  placeholder?: string;
  height?: number;
  minHeight?: number;
  disabled?: boolean;
  dataField?: string;
  showMenubar?: boolean;
  id?: string;
}

export function CrmRichTextEditor({
  value = '',
  onChange,
  onFocus,
  onClick,
  placeholder,
  height = 220,
  minHeight = 180,
  disabled = false,
  dataField,
  showMenubar = true,
  id,
}: CrmRichTextEditorProps) {
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
      value.includes('<ol>') ||
      value.includes('<table>')
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
      id={id || (dataField ? `crm-form-${dataField}` : undefined)}
      data-field={dataField}
      className="preana-rich-editor-wrapper crm-rich-editor-wrapper"
      onClick={() => {
        triggerEditorFocus();
        if (onClick) onClick();
      }}
      style={{
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid #cbd5e1',
        background: '#ffffff',
        transition: 'all 0.2s ease',
      }}
    >
      <style>{`
        .crm-rich-editor-wrapper .tox.tox-tinymce {
          border: none !important;
          border-radius: 6px !important;
        }
        .crm-rich-editor-wrapper .tox .tox-editor-header {
          display: flex !important;
          flex-direction: column !important;
          width: 100% !important;
          box-shadow: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
          padding: 0 !important;
          background: #f8fafc !important;
        }
        .crm-rich-editor-wrapper .tox .tox-menubar {
          display: ${showMenubar ? 'flex' : 'none'} !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          width: 100% !important;
          height: 26px !important;
          min-height: 26px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          background: #f8fafc !important;
          padding: 0 6px !important;
          overflow-x: auto !important;
        }
        .crm-rich-editor-wrapper .tox .tox-mbtn {
          height: 22px !important;
          min-height: 22px !important;
          padding: 0 6px !important;
          margin: 1px 0 !important;
          font-size: 11.5px !important;
          line-height: 22px !important;
          color: #475569 !important;
          border-radius: 3px !important;
          cursor: pointer !important;
        }
        .crm-rich-editor-wrapper .tox .tox-mbtn:hover {
          background: #e2e8f0 !important;
          color: #0f172a !important;
        }
        .crm-rich-editor-wrapper .tox .tox-toolbar-overlord {
          width: 100% !important;
          background: #ffffff !important;
        }
        .crm-rich-editor-wrapper .tox .tox-toolbar,
        .crm-rich-editor-wrapper .tox .tox-toolbar__primary {
          width: 100% !important;
          display: flex !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          height: 36px !important;
          min-height: 36px !important;
          padding: 2px 6px !important;
          background: #ffffff !important;
          overflow-x: auto !important;
          scrollbar-width: thin !important;
        }
        .crm-rich-editor-wrapper .tox .tox-toolbar__group {
          display: inline-flex !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          height: 32px !important;
          min-height: 32px !important;
          padding: 0 4px !important;
          margin: 0 !important;
          border-right: 1px solid #f1f5f9 !important;
        }
        .crm-rich-editor-wrapper .tox .tox-toolbar__group:last-child {
          border-right: none !important;
        }
        .crm-rich-editor-wrapper .tox .tox-tbtn {
          height: 30px !important;
          min-height: 30px !important;
          width: 30px !important;
          min-width: 30px !important;
          margin: 0 1px !important;
          padding: 0 !important;
          border-radius: 4px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          overflow: visible !important;
        }
        .crm-rich-editor-wrapper .tox .tox-tbtn__icon-wrap,
        .crm-rich-editor-wrapper .tox .tox-icon {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 24px !important;
          height: 24px !important;
          overflow: visible !important;
        }
        .crm-rich-editor-wrapper .tox .tox-tbtn svg {
          width: 24px !important;
          height: 24px !important;
          fill: #475569 !important;
          display: block !important;
          overflow: visible !important;
        }
        .crm-rich-editor-wrapper .tox .tox-tbtn:hover {
          background: #f1f5f9 !important;
          color: #0f172a !important;
        }
        .crm-rich-editor-wrapper .tox .tox-tbtn--enabled {
          background: #e2e8f0 !important;
        }
        .crm-rich-editor-wrapper .tox .tox-statusbar {
          border-top: 1px solid #f1f5f9 !important;
          height: 24px !important;
          min-height: 24px !important;
          padding: 0 8px !important;
          background: #f8fafc !important;
          font-size: 11px !important;
          color: #94a3b8 !important;
        }
        .crm-rich-editor-wrapper .tox .tox-statusbar__path { display: none !important; }
      `}</style>
      <Editor
        licenseKey="gpl"
        tinymceScriptSrc={tinymceSrc}
        value={value || ''}
        initialValue={initialHtml}
        disabled={disabled}
        onEditorChange={newHtml => {
          if (newHtml !== value) {
            onChange(newHtml);
          }
        }}
        init={{
          height: Math.max(height, minHeight),
          min_height: minHeight,
          menubar: showMenubar ? 'file edit insert view format table tools' : false,
          menu: {
            file: {title: 'File', items: 'newdocument | preview | print'},
            edit: {title: 'Edit', items: 'undo redo | cut copy paste pastetext | selectall | searchreplace'},
            insert: {title: 'Insert', items: 'image link table | hr charmap emoticons | insertdatetime'},
            view: {title: 'View', items: 'visualaid visualblocks | fullscreen'},
            format: {title: 'Format', items: 'bold italic underline strikethrough | styles blocks fontfamily fontsize | forecolor backcolor | align lineheight | removeformat'},
            table: {title: 'Table', items: 'inserttable | cell row column | tableprops deletetable'},
            tools: {title: 'Tools', items: 'wordcount'},
          },
          block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5;',
          placeholder: placeholder || '',
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
            'fullscreen',
            'preview',
            'insertdatetime',
            'table',
            'wordcount',
          ],
          toolbar: 'undo redo | blocks | bold italic underline forecolor | align | bullist numlist | link image table | fullscreen',
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
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              font-size: 13.5px; 
              line-height: 1.6; 
              color: #0f172a; 
              padding: 10px 14px; 
              background: #ffffff;
            }
            p { margin: 0 0 8px 0; }
            ol { margin: 0 0 10px 0; padding-left: 24px; list-style-type: decimal !important; }
            ol li { margin-bottom: 4px; }
            ul { margin: 0 0 10px 0; padding-left: 24px; list-style-type: disc !important; }
            ul li { margin-bottom: 4px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
            table, th, td { border: 1px solid #cbd5e1; }
            th, td { padding: 6px 10px; }
            th { background: #f8fafc; font-weight: 600; }
          `,
        }}
      />
    </div>
  );
}

