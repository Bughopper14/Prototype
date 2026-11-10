/** Pop-up that previews a document (PDF or image). */
import {ExternalLink, X} from 'lucide-react';
import {formatBytes} from '@/features/documents/lib/checklist/format-bytes';
import type {PreviewState} from '@/features/documents/lib/checklist/types';

export function DocumentPreviewModal({preview, onClose}: {preview: PreviewState; onClose: () => void}) {
  return (
    <div className="modal-scrim" onClick={() => onClose()}>
      <div
        className="modal doc-preview-modal"
        style={{width: 'min(95vw, 920px)', maxHeight: '92vh', display: 'flex', flexDirection: 'column'}}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="modal-head"
          style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}
        >
          <div>
            <h2>{preview.title}</h2>
            <p className="muted" style={{fontSize: '11.5px', marginTop: 2}}>
              Sumber: <strong>{preview.source}</strong> · {preview.fileName}
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

        <div
          className="modal-body"
          style={{
            flex: 1,
            padding: 16,
            overflowY: 'auto',
            background: '#0b1329',
            minHeight: '480px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {preview.isPdf ? (
            <iframe
              src={preview.url}
              title="PDF Document Preview"
              style={{
                width: '100%',
                height: '580px',
                border: 'none',
                borderRadius: 8,
                background: '#fff',
              }}
            />
          ) : (
            <img
              src={preview.url}
              alt={preview.title}
              style={{
                maxWidth: '100%',
                maxHeight: '580px',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
              onError={e => {
                const target = e.target as HTMLElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const msg = document.createElement('div');
                  msg.style.color = '#cbd5e1';
                  msg.style.padding = '30px';
                  msg.style.textAlign = 'center';
                  msg.innerHTML =
                    '<p>Pratinjau fisik berkas belum dapat dimuat langsung.</p><small>Klik tombol "Buka Berkas" di bawah untuk mengakses dokumen.</small>';
                  parent.appendChild(msg);
                }
              }}
            />
          )}
        </div>

        <div className="modal-actions" style={{justifyContent: 'space-between', padding: '14px 20px'}}>
          <div style={{fontSize: '11px', color: '#64748b'}}>
            {preview.uploadedAt
              ? `Diunggah pada: ${new Date(preview.uploadedAt).toLocaleString('id-ID')}`
              : 'Tersimpan di penyimpanan dokumen sistem'}
          </div>
          <div style={{display: 'flex', gap: 8}}>
            <a
              href={preview.url}
              target="_blank"
              rel="noreferrer"
              className="button"
              style={{display: 'inline-flex', alignItems: 'center', gap: 6}}
            >
              <ExternalLink size={13} />
              <span>Buka di Tab Baru</span>
            </a>
            <button type="button" className="button primary" onClick={() => onClose()}>
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
