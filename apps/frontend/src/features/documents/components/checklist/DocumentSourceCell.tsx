/** Where a document comes from, the note about it and its uploaded files. */
import {FileText, Upload, Trash2, Lock, Loader2} from 'lucide-react';
import {formatBytes} from '@/features/documents/lib/checklist/format-bytes';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export function DocumentSourceCell({
  row,
  deletingFileId,
  onDelete,
  onPreviewFile,
}: {
  row: ChecklistRow;
  deletingFileId: string | null;
  onDelete: (fileId: string, code: string) => void;
  /** Opens one chosen file of the row (a row can have several). */
  onPreviewFile?: (file: any) => void;
}) {
  const hasFiles = row.files && row.files.length > 0;

  return (
    <div className="doc-source-details-box">
      {row.sourceType === 'SYSTEM_LINKED' && (
        <div className="source-chip chip-system" title="Automatically connected from related module" style={{marginBottom: '4px'}}>
          <Lock size={11} style={{marginRight: 4}} />
          <span>{row.sourceLabel}</span>
        </div>
      )}
      {row.sourceType === 'MANUAL' && (
        <div
          style={{
            fontSize: '11.5px',
            fontWeight: 600,
            color: '#2563eb',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Upload size={12} />
          <span>Manual Upload {hasFiles ? `· ${row.files.length} berkas diunggah` : ''}</span>
        </div>
      )}
      {row.sourceType === 'NONE' && (
        <span style={{fontSize: '12px', color: '#64748b'}}>
          No files or linked data yet
        </span>
      )}

      {row.sourceDetails && (
        <p className="source-sub-text" style={{margin: '2px 0 6px', fontSize: '11.5px', color: '#64748b'}}>
          {row.sourceDetails}
        </p>
      )}

      {/* List of uploaded files if any */}
      {hasFiles && (
        <div className="doc-file-pills-list" style={{display: 'flex', flexDirection: 'column', gap: '4px', width: '100%'}}>
          {row.files.map((f: any) => {
            const isManual = row.canDelete;
            const isDeleting = deletingFileId === f.id;

            return (
              <div
                key={f.id || f.fileName}
                className="doc-file-item-card"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden'}}>
                  <FileText size={13} style={{color: '#2563eb', flexShrink: 0}} />
                  <span
                    className="file-pill-name"
                    title={f.fileName}
                    style={{
                      cursor: onPreviewFile ? 'pointer' : 'default',
                      textDecoration: onPreviewFile ? 'underline' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    onClick={onPreviewFile ? () => onPreviewFile(f) : undefined}
                  >
                    {f.fileName}
                  </span>
                  <span style={{color: '#94a3b8', fontSize: '10.5px', flexShrink: 0}}>
                    · {formatBytes(f.fileSize)}
                  </span>
                </div>

                {isManual && f.id && (
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: '#dc2626',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                    title="Delete this file"
                    disabled={isDeleting}
                    onClick={() => onDelete(f.id, row.code)}
                  >
                    {isDeleting ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
