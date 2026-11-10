/** Pop-up with the upload history of the selected stage. */
import {Modal} from '@/shared/ui/Modal';
import {Download, Eye, FileText, Trash2} from 'lucide-react';

import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function UploadHistoryModal() {
  const {
    a,
    isFapLocked,
    activeFile,
    showHistoryModal,
    setShowHistoryModal,
    activeItem,
    activeFiles,
    canUpload,
    previewFile,
    handleDeleteFile,
  } = useDocumentsStudioContext();
  return (
    <>
      {showHistoryModal && (
        <Modal title={`Upload History · ${activeItem.title}`} onClose={() => setShowHistoryModal(false)}>
          <div className="modal-body" style={{maxHeight: '70vh', overflowY: 'auto'}}>
            <p className="muted" style={{marginBottom: '14px'}}>
              Debtor: <strong>{a.customer?.companyName || 'Debtor'}</strong> · FAP No:{' '}
              <strong>{a.fapNumber || '-'}</strong> · Total <strong>{activeFiles.length} files</strong>
            </p>
            {activeFiles.length === 0 ? (
              <div style={{textAlign: 'center', padding: '32px 16px', color: '#94a3b8'}}>
                <FileText size={36} style={{margin: '0 auto 10px auto', display: 'block'}} />
                <p>No files uploaded for this stage yet.</p>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {activeFiles.map((f: any) => {
                  const isPreviewed = activeFile?.id === f.id;
                  const isPdf =
                    f.mimeType === 'application/pdf' || f.fileName?.toLowerCase().endsWith('.pdf');
                  const sizeNum = Number(f.fileSize || 0);
                  const sizeStr =
                    sizeNum > 1024 * 1024
                      ? `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`
                      : `${Math.max(1, Math.round(sizeNum / 1024))} KB`;
                  const dateStr = f.createdAt
                    ? new Date(f.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  return (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        border: isPreviewed ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                        background: isPreviewed ? '#eff6ff' : '#ffffff',
                        borderRadius: '8px',
                        gap: '12px',
                      }}
                    >
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1}}>
                        <div
                          className={`evidence-file-icon-box ${isPdf ? 'pdf' : 'img'}`}
                          style={{flexShrink: 0}}
                        >
                          <FileText size={18} />
                          <span className="evidence-file-format-tag">{isPdf ? 'PDF' : 'IMG'}</span>
                        </div>
                        <div style={{minWidth: 0, flex: 1}}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '13px',
                              color: '#0f172a',
                              wordBreak: 'break-all',
                            }}
                            title={f.fileName}
                          >
                            {f.fileName}
                          </div>
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: '#64748b',
                              marginTop: '2px',
                              display: 'flex',
                              gap: '8px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span>{sizeStr}</span>
                            {dateStr && <span>• {dateStr}</span>}
                            {f.uploadedBy && <span>• Uploaded by: {f.uploadedBy}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0}}>
                        <button
                          type="button"
                          className={`button small ${isPreviewed ? 'primary' : ''}`}
                          onClick={() => {
                            previewFile(f);
                            setShowHistoryModal(false);
                          }}
                          title="Show in preview screen"
                        >
                          <Eye size={13} /> {isPreviewed ? 'Active' : 'Preview'}
                        </button>
                        <a
                          href={`/api/v1/files/${f.id}/download`}
                          download={f.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="button small"
                          title="Download file"
                          style={{display: 'inline-flex', alignItems: 'center'}}
                        >
                          <Download size={13} />
                        </a>
                        {canUpload && !(isFapLocked && activeItem.code === 'FAP') && (
                          <button
                            type="button"
                            className="button small"
                            onClick={() => handleDeleteFile(activeItem, f.id)}
                            title="Delete file"
                            style={{color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2'}}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setShowHistoryModal(false)}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
