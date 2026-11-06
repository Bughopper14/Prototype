/** Document pane: image / PDF viewer or empty dropzone. */
import {RotateCw, Sparkles, Upload, ZoomIn, ZoomOut} from 'lucide-react';

import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function DocumentViewer() {
  const {
    editorLocked,
    docType,
    zoom,
    setZoom,
    rotation,
    setRotation,
    currentAsset,
    handleUploadDoc,
    docTitles,
  } = useStakeholderModalContext();
  return (
    <>
      {currentAsset.url ? (
        <div className="ktp-viewer-card">
          <div className="ktp-viewer-controls">
            <span className="ktp-viewer-filename">{currentAsset.fileName || `${docType} File`}</span>
            <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
              <button
                type="button"
                className="ktp-ctrl-btn"
                onClick={() => setZoom(z => Math.max(0.75, z - 0.25))}
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span style={{fontSize: '10px', color: '#475569', minWidth: '28px', textAlign: 'center'}}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                className="ktp-ctrl-btn"
                onClick={() => setZoom(z => Math.min(2.5, z + 0.25))}
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                className="ktp-ctrl-btn"
                onClick={() => setRotation(r => (r + 90) % 360)}
                title="Putar 90°"
              >
                <RotateCw size={13} />
              </button>
              {(zoom !== 1 || rotation !== 0) && (
                <button
                  type="button"
                  className="ktp-ctrl-btn reset"
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                  }}
                  title="Reset View"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="ktp-img-stage">
            {currentAsset.mime?.includes('pdf') || currentAsset.fileName?.toLowerCase().endsWith('.pdf') ? (
              <iframe title={`${docType} PDF`} src={currentAsset.url} className="ktp-preview-iframe" />
            ) : (
              <div className="ktp-img-viewport">
                <img
                  src={currentAsset.url}
                  alt={`${docType} Preview`}
                  className="ktp-preview-img-interactive"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <label className="ktp-upload-box-enhanced">
          <div className="ktp-upload-icon-circle">
            <Upload size={28} />
          </div>
          <div style={{textAlign: 'center'}}>
            <b style={{fontSize: '14.5px', color: '#0f172a', display: 'block'}}>
              Upload Scan / Photo {docTitles[docType]}
            </b>
            <span style={{fontSize: '12px', color: '#64748b', display: 'block', marginTop: '4px'}}>
              Select image format (JPG, PNG) or PDF document
            </span>
          </div>
          <div className="ktp-upload-tip">
            <Sparkles size={14} style={{color: '#002060', flexShrink: 0}} />
            <span>
              Identity data on the document will be automatically scanned in a structured format according to
              the {docType} format to facilitate verification.
            </span>
          </div>
          <input
            type="file"
            accept="image/*,application/pdf"
            style={{display: 'none'}}
            disabled={editorLocked}
            onChange={e => handleUploadDoc(e, docType)}
          />
        </label>
      )}
    </>
  );
}
