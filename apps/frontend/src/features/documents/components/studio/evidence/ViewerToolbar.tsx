/** Evidence viewer: zoom, rotate, download, review actions. */
import {Columns, Download, ExternalLink, Maximize2, Minimize2, RotateCw, ZoomIn, ZoomOut} from 'lucide-react';

import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function ViewerToolbar() {
  const {
    activeFileUrl,
    activeFile,
    zoom,
    setZoom,
    rotation,
    setRotation,
    pdfZoom,
    setPdfZoom,
    sidebarCollapsed,
    setSidebarCollapsed,
    isMaximized,
    setIsMaximized,
  } = useDocumentsStudioContext();
  return (
    <div className="studio-glass-toolbar">
      <div className="studio-toolbar-left">
        <button
          type="button"
          className="studio-toolbar-toggle-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Show file list (Split View)' : 'Expand Preview (Full Canvas)'}
        >
          <Columns size={14} />
          <span>{sidebarCollapsed ? 'Split View' : 'Full Canvas'}</span>
        </button>
        {activeFile && (
          <span className="studio-file-chip">
            <span className="studio-file-tag">
              {activeFile.mimeType === 'application/pdf' ? 'PDF' : 'IMG'}
            </span>
            <span className="studio-file-name">{activeFile.fileName}</span>
            {activeFile.fileSize && (
              <span className="studio-file-size">({(activeFile.fileSize / 1024).toFixed(0)} KB)</span>
            )}
          </span>
        )}
      </div>

      <div className="studio-toolbar-center">
        {activeFile?.mimeType === 'application/pdf' && (
          <div className="studio-pdf-zoom-group">
            <button
              type="button"
              className={`evidence-zoom-pill ${pdfZoom === 'FitH' ? 'active' : ''}`}
              onClick={() => setPdfZoom('FitH')}
              title="Pas Lebar (Fit Width)"
            >
              Fit Width
            </button>
            <button
              type="button"
              className={`evidence-zoom-pill ${pdfZoom === '100' ? 'active' : ''}`}
              onClick={() => setPdfZoom('100')}
              title="Skala 100%"
            >
              100%
            </button>
            <button
              type="button"
              className={`evidence-zoom-pill ${pdfZoom === '125' ? 'active' : ''}`}
              onClick={() => setPdfZoom('125')}
              title="Skala 125%"
            >
              125%
            </button>
            <button
              type="button"
              className={`evidence-zoom-pill ${pdfZoom === 'Fit' ? 'active' : ''}`}
              onClick={() => setPdfZoom('Fit')}
              title="Pas Halaman (Fit Page)"
            >
              Fit Page
            </button>
          </div>
        )}

        {activeFile?.mimeType?.startsWith('image/') && (
          <div className="studio-image-controls">
            <button
              type="button"
              className="studio-tool-btn"
              onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="studio-zoom-val">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="studio-tool-btn"
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              className="studio-tool-btn"
              onClick={() => setRotation(rotation + 90)}
              title="Rotate 90 Degrees"
            >
              <RotateCw size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="studio-toolbar-right">
        {activeFileUrl && (
          <>
            <a
              href={activeFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="studio-tool-btn"
              title="Open document in new tab"
            >
              <ExternalLink size={14} />
            </a>
            <a
              href={`/api/v1/files/${activeFile?.id}/download`}
              download={activeFile?.fileName || 'document'}
              className="studio-tool-btn"
              title="Download document"
            >
              <Download size={14} />
            </a>
          </>
        )}
        <button
          type="button"
          className="studio-tool-btn"
          onClick={() => setIsMaximized(!isMaximized)}
          title={isMaximized ? 'Minimize canvas' : 'Maximize canvas'}
        >
          {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
    </div>
  );
}
