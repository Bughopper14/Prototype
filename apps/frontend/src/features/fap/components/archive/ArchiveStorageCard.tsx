/** Where the signed FAP document is stored, with copy path. */
import {Check, Copy, FolderCheck} from 'lucide-react';

export function ArchiveStorageCard({
  current,
  copied,
  handleCopyPath,
}: {
  current: any;
  copied: boolean;
  handleCopyPath: (pathText: string) => void;
}) {
  return (
    <div style={{background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0'}}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 700,
            fontSize: 13,
            color: '#002060',
          }}
        >
          <FolderCheck size={16} />
          <span>Lokasi Penyimpanan Dokumen (Physical Document Storage Path)</span>
        </div>
        {current.ocr_document_path && (
          <button
            type="button"
            className="button small"
            style={{
              fontSize: 11,
              padding: '3px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            onClick={() => handleCopyPath(current.ocr_document_path)}
          >
            {copied ? <Check size={12} style={{color: '#10b981'}} /> : <Copy size={12} />}
            <span>{copied ? 'Copied!' : 'Copy Path'}</span>
          </button>
        )}
      </div>
      <div
        style={{
          background: '#ffffff',
          padding: '8px 12px',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          fontSize: 12,
          fontFamily: 'monospace',
          wordBreak: 'break-all',
          color: current.ocr_document_path ? '#0f172a' : '#94a3b8',
        }}
      >
        {current.ocr_document_path ||
          'Lokasi dokumen fisik: Belum terindeks pada direktori server atau diunggah secara virtual'}
      </div>
      {current.ocr_document_filename && (
        <div style={{marginTop: 6, fontSize: 11, color: '#64748b'}}>
          Nama File Dokumen: <strong>{current.ocr_document_filename}</strong>
        </div>
      )}
    </div>
  );
}
