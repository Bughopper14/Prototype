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
  // "Ganti" (replace) is only for the FAP (one current signed file); every other document takes more files ("Tambah"); a document with no file yet says "Upload"
  const hasFile = (row.files || []).length > 0;
  return (
    <div className="doc-row-actions">
      {/* Preview button if available */}
      {row.isAvailable && (
        <button
          type="button"
          className="button small doc-action-btn btn-view"
          title="Preview Physical Document"
          onClick={() => onPreview(row)}
        >
          <Eye size={13} />
          <span>View</span>
        </button>
      )}

      {/* Upload Button */}
      <button
        type="button"
        className={`button small doc-action-btn ${hasFile ? 'btn-replace' : 'primary btn-upload'}`}
        title={hasFile ? 'Replace / Upload additional file' : 'Upload file now'}
        disabled={isUploading}
        onClick={() => onUpload(row.code)}
      >
        {isUploading ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
        <span>{hasFile ? 'Replace' : 'Upload'}</span>
      </button>

      {/* Delete Button / Lock Indicator (with several files each file has its own delete button in the file list) */}
      {row.isAvailable && !(row.canDelete && row.files.length > 1) &&
        (row.canDelete && row.files[0]?.id && row.files.length === 1 ? (
          <button
            type="button"
            className="button small doc-action-btn btn-delete text-danger"
            title="Delete Manual File"
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
            title={`This document is automatically linked from ${row.sourceLabel}. Delete or update it from that module.`}
          >
            <Lock size={13} />
          </div>
        ))}
    </div>
  );
}
