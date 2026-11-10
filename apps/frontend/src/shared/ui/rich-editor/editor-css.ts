/** Look of the TinyMCE toolbar, menu bar and frame inside the CRM form (scoped to the editor wrapper). */
export const richEditorCss = (showMenubar: boolean) => `
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
        .preana-rich-editor-wrapper .tox .tox-mbtn {
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
          height: 36px !important;
          min-height: 36px !important;
          padding: 2px 6px !important;
          background: #ffffff !important;
          overflow-x: auto !important;
          scrollbar-width: thin !important;
        }
        .preana-rich-editor-wrapper .tox .tox-toolbar__group {
          display: inline-flex !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          height: 32px !important;
          min-height: 32px !important;
          padding: 0 4px !important;
          margin: 0 !important;
          border-right: 1px solid #f1f5f9 !important;
        }
        .preana-rich-editor-wrapper .tox .tox-toolbar__group:last-child {
          border-right: none !important;
        }
        .preana-rich-editor-wrapper .tox .tox-tbtn {
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
        .preana-rich-editor-wrapper .tox .tox-tbtn__icon-wrap,
        .preana-rich-editor-wrapper .tox .tox-icon {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 24px !important;
          height: 24px !important;
          overflow: visible !important;
        }
        .preana-rich-editor-wrapper .tox .tox-tbtn svg {
          width: 24px !important;
          height: 24px !important;
          fill: #475569 !important;
          display: block !important;
          overflow: visible !important;
        }
        .preana-rich-editor-wrapper .tox .tox-tbtn:hover {
          background: #f1f5f9 !important;
          color: #0f172a !important;
        }
        .preana-rich-editor-wrapper .tox .tox-tbtn--enabled {
          background: #e2e8f0 !important;
        }
        .preana-rich-editor-wrapper .tox .tox-tbtn--select {
          height: 30px !important;
          min-height: 30px !important;
          width: auto !important;
          min-width: 78px !important;
          padding: 0 6px !important;
          font-size: 11.5px !important;
          margin: 0 2px !important;
        }
        .preana-rich-editor-wrapper .tox .tox-tbtn__select-label {
          font-size: 11.5px !important;
          line-height: 30px !important;
          font-weight: 500 !important;
          color: #334155 !important;
        }
        .preana-rich-editor-wrapper .tox .tox-tbtn__select-chevron {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .preana-rich-editor-wrapper .tox .tox-tbtn__select-chevron svg {
          width: 10px !important;
          height: 10px !important;
        }
        .preana-rich-editor-wrapper .tox .tox-split-button {
          height: 30px !important;
          min-height: 30px !important;
          margin: 0 2px !important;
        }
        .preana-rich-editor-wrapper .tox .tox-split-button .tox-tbtn {
          height: 30px !important;
          min-height: 30px !important;
        }
        .preana-rich-editor-wrapper .tox .tox-split-button__chevron svg {
          width: 10px !important;
          height: 10px !important;
        }
        .preana-rich-editor-wrapper .tox button[data-mce-name="redo"],
        .preana-rich-editor-wrapper .tox button[aria-label*="Redo"],
        .preana-rich-editor-wrapper .tox button[title*="Redo"] {
          margin-left: 7px !important;
        }
        .preana-rich-editor-wrapper .tox button[data-mce-name="bold"],
        .preana-rich-editor-wrapper .tox button[aria-label*="Bold"],
        .preana-rich-editor-wrapper .tox button[title*="Bold"] {
          margin-left: 7px !important;
        }
        .preana-rich-editor-wrapper .tox button[data-mce-name="italic"],
        .preana-rich-editor-wrapper .tox button[aria-label*="Italic"],
        .preana-rich-editor-wrapper .tox button[title*="Italic"] {
          margin-left: 3px !important;
        }
        .preana-rich-editor-wrapper .tox button[data-mce-name="underline"],
        .preana-rich-editor-wrapper .tox button[aria-label*="Underline"],
        .preana-rich-editor-wrapper .tox button[title*="Underline"] {
          margin-left: 3px !important;
        }
        .preana-rich-editor-wrapper .tox button[data-mce-name="forecolor"],
        .preana-rich-editor-wrapper .tox button[aria-label*="Text color"],
        .preana-rich-editor-wrapper .tox button[title*="Text color"],
        .preana-rich-editor-wrapper .tox .tox-split-button[data-mce-name="forecolor"],
        .preana-rich-editor-wrapper .tox .tox-split-button:has([data-mce-name="forecolor"]),
        .preana-rich-editor-wrapper .tox .tox-split-button:has([aria-label*="Text color"]) {
          margin-left: 4px !important;
        }
        .preana-rich-editor-wrapper .tox button[data-mce-name="bullist"]:not(.tox-split-button__chevron) .tox-icon,
        .preana-rich-editor-wrapper .tox button[aria-label*="Bullet list"]:not(.tox-split-button__chevron) .tox-icon,
        .preana-rich-editor-wrapper .tox button[title*="Bullet list"]:not(.tox-split-button__chevron) .tox-icon,
        .preana-rich-editor-wrapper .tox .tox-split-button:has([data-mce-name="bullist"]) .tox-split-button__main .tox-icon,
        .preana-rich-editor-wrapper .tox .tox-split-button:has([aria-label*="Bullet list"]) .tox-split-button__main .tox-icon,
        .preana-rich-editor-wrapper .tox button[data-mce-name="numlist"]:not(.tox-split-button__chevron) .tox-icon,
        .preana-rich-editor-wrapper .tox button[aria-label*="Numbered list"]:not(.tox-split-button__chevron) .tox-icon,
        .preana-rich-editor-wrapper .tox button[title*="Numbered list"]:not(.tox-split-button__chevron) .tox-icon,
        .preana-rich-editor-wrapper .tox .tox-split-button:has([data-mce-name="numlist"]) .tox-split-button__main .tox-icon,
        .preana-rich-editor-wrapper .tox .tox-split-button:has([aria-label*="Numbered list"]) .tox-split-button__main .tox-icon {
          transform: translateY(2.5px) !important;
        }
        .preana-rich-editor-wrapper .tox .tox-edit-area {
          border-top: none !important;
        }
        .preana-rich-editor-wrapper .tox .tox-edit-area__iframe {
          background: #ffffff !important;
        }
        .preana-rich-editor-wrapper .tox .tox-statusbar {
          border-top: 1px solid #f1f5f9 !important;
          height: 24px !important;
          min-height: 24px !important;
          padding: 0 8px !important;
          background: #f8fafc !important;
          font-size: 11px !important;
          color: #94a3b8 !important;
        }
        .preana-rich-editor-wrapper .tox .tox-statusbar__path { display: none !important; }
        .preana-rich-editor-wrapper .tox-statusbar__path { display: none !important; }
        .preana-rich-editor-wrapper .tox-statusbar__path-item { display: none !important; }
      `;
