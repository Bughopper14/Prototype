/** Where a document comes from, the note about it and its uploaded files. */
import {FileText, Upload, Trash2, Lock, Loader2} from 'lucide-react';
import {formatBytes} from '@/features/documents/lib/checklist/format-bytes';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export function DocumentSourceCell({
  row,
  deletingFileId,
  onDelete,
}: {
  row: ChecklistRow;
  deletingFileId: string | null;
  onDelete: (fileId: string, code: string) => void;
}) {
  return (
    <div className="doc-source-details-box">
      {row.sourceType === 'SYSTEM_LINKED' && (
        <div className="source-chip chip-system" title="Terhubung otomatis dari modul terkait">
          <Lock size={11} style={{marginRight: 4}} />
          <span>{row.sourceLabel}</span>
        </div>
      )}
      {row.sourceType === 'MANUAL' && (
        <div className="source-chip chip-manual" title="Diunggah secara mandiri pada checklist">
          <Upload size={11} style={{marginRight: 4}} />
          <span>Upload Manual</span>
        </div>
      )}
      {row.sourceType === 'NONE' && (
        <span className="muted" style={{fontSize: '11.5px'}}>
          Belum ada berkas atau data terkait
        </span>
      )}

      {row.sourceDetails && <p className="source-sub-text">{row.sourceDetails}</p>}

      {/* List of uploaded files if any */}
      {row.files && row.files.length > 0 && (
        <div className="doc-file-pills-list">
          {row.files.map((f: any) => {
            const isManual = row.canDelete;
            const isDeleting = deletingFileId === f.id;

            return (
              <div key={f.id || f.fileName} className="doc-file-pill">
                <FileText size={12} className="text-blue" />
                <span className="file-pill-name" title={f.fileName}>
                  {f.fileName}
                </span>
                <span className="file-pill-size">{formatBytes(f.fileSize)}</span>
                {isManual && f.id && (
                  <button
                    type="button"
                    className="file-delete-icon-btn"
                    title="Hapus berkas ini"
                    disabled={isDeleting}
                    onClick={() => onDelete(f.id, row.code)}
                  >
                    {isDeleting ? <Loader2 size={11} className="spin" /> : <Trash2 size={11} />}
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
