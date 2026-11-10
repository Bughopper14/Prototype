/** View, upload / replace and delete (or lock) buttons of a document row. */
import {Upload, Trash2, Lock, Eye, Loader2} from 'lucide-react';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export function DocumentRowActions({
  row,
  isUploading,
  deletingFileId,
  onPreview,
  onUpload,
  onDelete,
}: {
  row: ChecklistRow;
  isUploading: boolean;
  deletingFileId: string | null;
  onPreview: (row: ChecklistRow) => void;
  onUpload: (code: string) => void;
  onDelete: (fileId: string, code: string) => void;
}) {
  return (
    <div className="doc-row-actions">
      {/* Preview button if available */}
      {row.isAvailable && (
        <button
          type="button"
          className="button small doc-action-btn btn-view"
          title="Pratinjau Dokumen Fisik"
          onClick={() => onPreview(row)}
        >
          <Eye size={13} />
          <span>Lihat</span>
        </button>
      )}

      {/* Upload Button */}
      <button
        type="button"
        className={`button small doc-action-btn ${row.isAvailable ? 'btn-replace' : 'primary btn-upload'}`}
        title={row.isAvailable ? 'Ganti / Upload Berkas Tambahan' : 'Upload Berkas Sekarang'}
        disabled={isUploading}
        onClick={() => onUpload(row.code)}
      >
        {isUploading ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
        <span>{row.isAvailable ? 'Ganti' : 'Upload'}</span>
      </button>

      {/* Delete Button / Lock Indicator */}
      {row.isAvailable &&
        (row.canDelete && row.files[0]?.id ? (
          <button
            type="button"
            className="button small doc-action-btn btn-delete text-danger"
            title="Hapus Berkas Manual"
            disabled={deletingFileId === row.files[0].id}
            onClick={() => onDelete(row.files[0].id, row.code)}
          >
            {deletingFileId === row.files[0].id ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <Trash2 size={13} />
            )}
          </button>
        ) : (
          <div
            className="locked-action-indicator"
            title={`Dokumen ini terhubung otomatis dari ${row.sourceLabel}. Hapus atau ubah dokumen melalui modul tersebut.`}
          >
            <Lock size={13} />
          </div>
        ))}
    </div>
  );
}
