/** View, upload / replace and delete buttons of a document row matching the mockup. */
import {useState} from 'react';
import {Upload, Eye, Loader2} from 'lucide-react';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';
import {ConfirmUploadBubble} from '@/shared/ui/ConfirmUploadBubble';

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hasFile = (row.files || []).length > 0;
  const canPreview = row.isAvailable && (hasFile || !!row.previewUrl);
  // The FAP has one current signed file (a new one replaces it); every other document keeps all its files.
  const replaces = row.code === 'FAP';

  const approval = row.check?.approval;
  const isPendingApproval =
    approval?.state === 'IN_APPROVAL' ||
    approval?.state === 'PENDING' ||
    row.check?.approvalStatus === 'IN_APPROVAL' ||
    row.check?.approval_status === 'IN_APPROVAL';
  const isApproved =
    approval?.state === 'APPROVED' ||
    row.check?.approvalStatus === 'APPROVED' ||
    row.check?.approval_status === 'APPROVED' ||
    row.status === 'VERIFIED';
  // Allow upload when approved (restarts approval), block only when actively pending in an ongoing round
  const isLockedForUpload = isPendingApproval;

  const handleUploadClick = () => {
    if (isApproved) {
      setConfirmOpen(true);
    } else {
      onUpload(row.code, row.chkId);
    }
  };

  if (!hasFile) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', position: 'relative'}}>
        <button
          type="button"
          className="btn-action-primary"
          title={isPendingApproval ? 'Document is currently in approval' : isApproved ? 'Document is approved (click to replace)' : 'Upload file now'}
          disabled={isUploading || isLockedForUpload}
          onClick={handleUploadClick}
        >
          {isUploading ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
          <span>Upload</span>
        </button>

        <ConfirmUploadBubble
          open={confirmOpen}
          title="Restart Document Approval?"
          message={`This document (${row.name}) has already been approved. Uploading a new file will restart the approval process specifically for this document. Are you sure you want to proceed?`}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            onUpload(row.code, row.chkId);
          }}
          placement="center"
        />
      </div>
    );
  }

  return (
    <div style={{display: 'flex', gap: '6px', justifyContent: 'center', position: 'relative'}}>
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
        style={{
          height: '32px',
          padding: '0 10px',
          fontSize: '11.5px',
          ...(isLockedForUpload ? {opacity: 0.5, cursor: 'not-allowed'} : {}),
        }}
        title={
          isPendingApproval
            ? 'Document is currently in approval process'
            : isApproved
            ? 'Document has been approved. Click to upload a new version and restart approval.'
            : replaces
            ? 'Upload a new signed file (the current one is replaced)'
            : 'Upload an additional file'
        }
        disabled={isUploading || isLockedForUpload}
        onClick={handleUploadClick}
      >
        {isUploading ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
        <span>{replaces ? 'Replace' : 'Add file'}</span>
      </button>

      <ConfirmUploadBubble
        open={confirmOpen}
        title="Restart Document Approval?"
        message={`This document (${row.name}) has already been approved. Uploading a new file will restart the approval process specifically for this document. Are you sure you want to proceed?`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onUpload(row.code, row.chkId);
        }}
        placement="center"
      />
    </div>
  );
}
