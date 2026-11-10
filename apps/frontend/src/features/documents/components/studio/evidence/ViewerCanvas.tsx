/** Evidence viewer: the document canvas (PDF / image). */
import {FileText} from 'lucide-react';

import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function ViewerCanvas() {
  const {activeFileUrl, activeFile, zoom, rotation, pdfZoom, pdfViewerSrc} = useDocumentsStudioContext();
  return (
    <div className="studio-viewport-canvas">
      {activeFileUrl ? (
        activeFile?.mimeType === 'application/pdf' ? (
          <iframe
            key={`${activeFile.id}-${pdfZoom}`}
            title={activeFile.fileName}
            src={pdfViewerSrc}
            className="studio-pdf-iframe"
          />
        ) : (
          <div className="studio-image-wrapper">
            <img
              alt={activeFile?.fileName}
              src={activeFileUrl}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transition: 'transform 0.15s ease',
              }}
            />
          </div>
        )
      ) : (
        <div className="studio-empty-canvas">
          <div className="studio-empty-icon-wrap">
            <FileText size={44} />
          </div>
          <h3>Select a Document for Live Preview</h3>
          <p>Select a file from the list on the left to view the full preview in this studio canvas.</p>
          <div className="studio-empty-features">
            <span>✓ High-resolution PDF & Image preview</span>
            <span>✓ Zoom Fit Width & Fit Page scale controls</span>
            <span>✓ Fullscreen mode for committee evaluation</span>
          </div>
        </div>
      )}
    </div>
  );
}
