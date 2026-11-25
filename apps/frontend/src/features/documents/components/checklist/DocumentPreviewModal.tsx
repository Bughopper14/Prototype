/** Pop-up that previews a document (PDF or image) with caching and download support. */
import {useState} from 'react';
import {Download, ExternalLink, Loader2, RotateCcw, X} from 'lucide-react';
import {formatBytes} from '@/features/documents/lib/checklist/format-bytes';
import type {PreviewState} from '@/features/documents/lib/checklist/types';

export function DocumentPreviewModal({preview, onClose}: {preview: PreviewState; onClose: () => void}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleReload = () => {
    setLoading(true);
    setLoadError(false);
    setReloadKey(k => k + 1);
  };

  const pdfUrl = preview.isPdf
    ? (preview.url.includes('#') ? preview.url : `${preview.url}#navpanes=0&view=FitH`)
    : preview.url;

  return (
    <div className="modal-scrim" onClick={() => onClose()}>
      <div
        className="modal doc-preview-modal"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="modal-head"
          style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}
        >
          <div>
            <h2>{preview.title}</h2>
            <p className="muted" style={{fontSize: '11.5px', marginTop: 2}}>
              Source: <strong>{preview.source}</strong> · {preview.fileName}
              {preview.fileSize ? ` · ${formatBytes(preview.fileSize)}` : ''}
            </p>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <button
              type="button"
              className="button small"
              title="Reload preview"
              onClick={handleReload}
              style={{padding: '6px 10px'}}
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              className="button small"
              onClick={() => onClose()}
              style={{padding: '6px 10px'}}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div
          className="modal-body"
          style={{
            flex: 1,
            padding: 16,
            overflowY: 'auto',
            background: '#0b1329',
            minHeight: '520px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {loading && !loadError && (
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                color: '#94a3b8',
                zIndex: 2,
              }}
            >
              <Loader2 size={32} className="spin" style={{color: '#3b82f6'}} />
              <span style={{fontSize: '12px', fontWeight: 500}}>Loading document preview...</span>
            </div>
          )}

          {loadError ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                color: '#cbd5e1',
                padding: '40px 20px',
                textAlign: 'center',
                maxWidth: 420,
              }}
            >
              <p style={{fontSize: '14px', fontWeight: 600, color: '#f1f5f9'}}>
                Unable to display preview directly in modal
              </p>
              <p style={{fontSize: '12px', color: '#94a3b8', margin: 0}}>
                The browser or document format could not be embedded inline. You can open or download the file directly below.
              </p>
              <div style={{display: 'flex', gap: 10, marginTop: 8}}>
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="button primary small"
                  style={{display: 'inline-flex', alignItems: 'center', gap: 6}}
                >
                  <ExternalLink size={13} />
                  <span>Open in New Tab</span>
                </a>
                <a
                  href={preview.url}
                  download={preview.fileName}
                  className="button small"
                  style={{display: 'inline-flex', alignItems: 'center', gap: 6}}
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ) : preview.isPdf ? (
            <iframe
              key={`pdf-${reloadKey}`}
              src={pdfUrl}
              className="doc-preview-iframe"
              title="PDF Document Preview"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setLoadError(true);
              }}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: 8,
                background: '#fff',
                opacity: loading ? 0.01 : 1,
                transition: 'opacity 0.2s ease',
              }}
            />
          ) : (
            <img
              key={`img-${reloadKey}`}
              src={preview.url}
              alt={preview.title}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setLoadError(true);
              }}
              style={{
                maxWidth: '100%',
                maxHeight: '600px',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                opacity: loading ? 0.01 : 1,
                transition: 'opacity 0.2s ease',
              }}
            />
          )}
        </div>

        <div className="modal-actions" style={{justifyContent: 'space-between', padding: '14px 20px'}}>
          <div style={{fontSize: '11px', color: '#64748b'}}>
            {preview.uploadedAt
              ? `Uploaded on: ${new Date(preview.uploadedAt).toLocaleString('en-US')}`
              : 'Stored in system document repository'}
          </div>
          <div style={{display: 'flex', gap: 8}}>
            <a
              href={preview.url}
              download={preview.fileName}
              className="button"
              style={{display: 'inline-flex', alignItems: 'center', gap: 6}}
            >
              <Download size={13} />
              <span>Download</span>
            </a>
            <a
              href={preview.url}
              target="_blank"
              rel="noreferrer"
              className="button"
              style={{display: 'inline-flex', alignItems: 'center', gap: 6}}
            >
              <ExternalLink size={13} />
              <span>Open in New Tab</span>
            </a>
            <button type="button" className="button primary" onClick={() => onClose()}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
