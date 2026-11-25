/** View, upload / replace and delete buttons of a document row matching the mockup. */
import {Upload, Eye, Loader2} from 'lucide-react';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export function DocumentRowActions({
  row,
  isUploading,
  onPreview,
  onUpload,
}: {
  row: ChecklistRow;
  isUploading: boolean;
  deletingFileId: string | null;
  onPreview: (row: ChecklistRow) => void;
  onUpload: (code: string, chkId?: string) => void;
  onDelete: (fileId: string, code: string) => void;
}) {
  const hasFile = (row.files || []).length > 0;
  const canPreview = row.isAvailable && (hasFile || !!row.previewUrl);
  // The FAP has one current signed file (a new one replaces it); every other document keeps all its files.
  const replaces = row.code === 'FAP';

  if (!hasFile) {
    return (
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <button
          type="button"
          className="btn-action-primary"
          title="Upload file now"
          disabled={isUploading}
          onClick={() => onUpload(row.code, row.chkId)}
        >
          {isUploading ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
          <span>Upload</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{display: 'flex', gap: '6px', justifyContent: 'center'}}>
      {canPreview && (
        <button
          type="button"
          className="btn-outline"
          style={{height: '32px', padding: '0 10px', fontSize: '11.5px'}}
          title="Preview Physical Document"
          onClick={() => onPreview(row)}
        >
          <Eye size={13} />
          <span>View</span>
        </button>
      )}

      <button
        type="button"
        className="btn-outline"
        style={{height: '32px', padding: '0 10px', fontSize: '11.5px'}}
        title={replaces ? 'Upload a new signed file (the current one is replaced)' : 'Upload an additional file'}
        disabled={isUploading}
        onClick={() => onUpload(row.code, row.chkId)}
      >
        {isUploading ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
        <span>{replaces ? 'Replace' : 'Add file'}</span>
      </button>
    </div>
  );
}
