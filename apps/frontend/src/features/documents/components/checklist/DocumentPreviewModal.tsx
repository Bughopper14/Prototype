/** Pop-up that previews a document (PDF or image) using the same light PdfPageCanvas viewer as Document Checklist. */
import {useCallback, useEffect, useState} from 'react';
import {Download, ExternalLink, FileText, Loader2, Minus, Plus, RotateCcw, RotateCw, X} from 'lucide-react';
import {PdfPageCanvas} from '@/features/documents/components/checklist/PdfPageCanvas';
import {formatBytes} from '@/features/documents/lib/checklist/format-bytes';
import type {PreviewState} from '@/features/documents/lib/checklist/types';
import './DocumentInspectModal.css';

export function DocumentPreviewModal({preview, onClose}: {preview: PreviewState; onClose: () => void}) {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [pageNum, setPageNum] = useState(1);
  const [jumpSeq, setJumpSeq] = useState(0);
  const [rotation, setRotation] = useState(0);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(preview.url, {credentials: 'same-origin'});
      if (!res.ok) throw new Error('Failed to load preview');
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      setBlobUrl(prev => {
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return objUrl;
      });
    } catch {
      setBlobUrl(preview.url);
    } finally {
      setLoading(false);
    }
  }, [preview.url]);

  useEffect(() => {
    setPageNum(1);
    setJumpSeq(0);
    setRotation(0);
    setZoom(100);
    loadPreview();
    return () => {
      setBlobUrl(prev => {
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return '';
      });
    };
  }, [loadPreview]);

  const effectiveUrl = blobUrl || preview.url;

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
          <button
            type="button"
            className="button small"
            onClick={() => onClose()}
            style={{padding: '6px 10px'}}
          >
            <X size={15} />
          </button>
        </div>

        {/* Light Toolbar matching Document Checklist */}
        <div className="doc-inspect-preview-toolbar">
          <div style={{display: 'flex', alignItems: 'center', gap: 10, minWidth: 0}}>
            <span style={{fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
              {preview.fileName || 'Document'}
            </span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <div className="doc-inspect-zoom-group">
              <button
                type="button"
                className="doc-inspect-pager-btn"
                onClick={() => setZoom(z => Math.max(50, z - 25))}
                title="Zoom out"
              >
                <Minus size={12} />
              </button>
              <span style={{fontSize: 12, fontWeight: 600, minWidth: 42, textAlign: 'center', color: '#0f172a'}}>
                {zoom}%
              </span>
              <button
                type="button"
                className="doc-inspect-pager-btn"
                onClick={() => setZoom(z => Math.min(200, z + 25))}
                title="Zoom in"
              >
                <Plus size={12} />
              </button>
            </div>
            <button
              type="button"
              className="doc-inspect-btn"
              style={{padding: '5px 8px'}}
              onClick={() => setRotation(r => (r + 90) % 360)}
              title="Rotate 90°"
            >
              <RotateCw size={13} />
            </button>
            <button
              type="button"
              className="doc-inspect-btn"
              style={{padding: '5px 8px'}}
              onClick={loadPreview}
              title="Reload preview"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* Light Scrollable Canvas matching Document Checklist */}
        <div
          className="doc-inspect-preview-canvas"
          style={{
            flex: 1,
            minHeight: '520px',
            background: '#f1f5f9',
            position: 'relative',
          }}
        >
          {loading ? (
            <div style={{display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13}}>
              <Loader2 size={18} className="spin" style={{color: '#2563eb'}} />
              <span>Loading preview...</span>
            </div>
          ) : loadError ? (
            <div style={{textAlign: 'center', color: '#64748b', fontSize: 13, maxWidth: 420}}>
              <FileText size={28} style={{margin: '0 auto 8px', color: '#94a3b8'}} />
              <div style={{fontWeight: 600, color: '#0f172a', marginBottom: 4}}>
                Unable to display preview directly in modal
              </div>
              <div style={{fontSize: 12, marginBottom: 12}}>
                The browser or document format could not be embedded inline. You can open or download the file directly below.
              </div>
              <div style={{display: 'flex', justifyContent: 'center', gap: 8}}>
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
            <PdfPageCanvas
              url={effectiveUrl}
              pageNum={pageNum}
              jumpSeq={jumpSeq}
              zoom={zoom}
              rotation={rotation}
              onNumPages={() => {}}
              onVisiblePageChange={setPageNum}
              onError={() => setLoadError(true)}
            />
          ) : (
            <img
              src={effectiveUrl}
              alt={preview.title}
              className="doc-inspect-preview-img"
              onError={() => setLoadError(true)}
              style={{
                width: `${zoom}%`,
                transform: rotation ? `rotate(${rotation}deg)` : undefined,
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
