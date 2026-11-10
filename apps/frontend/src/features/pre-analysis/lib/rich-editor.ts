/** Settings of the TinyMCE editor used by the Pre-Analysis form: styles, image picker and image upload. */

/** Styles of the TinyMCE toolbar and frame inside the Pre-Analysis form (scoped to the editor wrapper). */
export const RICH_EDITOR_WRAPPER_CSS = `
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
      `;

/** File picker of the image dialog: reads the chosen image as a data URL. */
export const pickImageFile = (callback: (url: string, meta?: any) => void) => {
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
};

/** Pasted / dropped images are kept inside the text as data URLs. */
export const imageUploadHandler = (blobInfo: any) =>
  new Promise((resolve, reject) => {
    try {
      const base64 = 'data:' + blobInfo.blob().type + ';base64,' + blobInfo.base64();
      resolve(base64);
    } catch (e: any) {
      reject(e?.message || 'Failed to upload image');
    }
  });

/** Look of the text inside the editor frame. */
export const RICH_EDITOR_CONTENT_STYLE = `
            body { 
              font-family: 'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              font-size: 13px; 
              line-height: 1.5; 
              color: #0f172a; 
              padding: 8px 12px; 
            }
            h1, h2, h3, h4, h5 {
              color: #1e3a8a;
              margin: 8px 0 4px 0;
              font-weight: 700;
            }
            h1 { font-size: 1.35rem; }
            h2 { font-size: 1.2rem; }
            h3 { font-size: 1.05rem; }
            h4 { font-size: 0.95rem; }
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
            img {
              max-width: 100%;
              height: auto;
              border-radius: 4px;
              display: block;
              margin: 8px auto;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 6px 0;
            }
            table td, table th {
              border: 1px solid #cbd5e1;
              padding: 4px 6px;
            }
          `;
