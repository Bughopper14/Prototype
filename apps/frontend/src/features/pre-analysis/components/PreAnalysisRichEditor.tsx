/** TinyMCE editor used by every rich-text field of the Pre-Analysis form. */
import {
  RICH_EDITOR_WRAPPER_CSS,
  RICH_EDITOR_CONTENT_STYLE,
  pickImageFile,
  imageUploadHandler,
} from '@/features/pre-analysis/lib/rich-editor';
import {useRef, useMemo} from 'react';
import {getStaticAssetUrl} from '@/features/pre-analysis/lib/text';
import {Editor} from '@tinymce/tinymce-react';

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
      <style>{RICH_EDITOR_WRAPPER_CSS}</style>
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
          placeholder: '',
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
          file_picker_callback: pickImageFile,
          paste_data_images: true,
          images_upload_handler: imageUploadHandler,
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
          content_style: RICH_EDITOR_CONTENT_STYLE,
        }}
      />
    </div>
  );
}
