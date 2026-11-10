/** Evidence view: stage card, upload dropzone and the stage file deck. */
import {Badge} from '@/shared/ui/Badge';
import {Eye, FileText, Trash2, Upload} from 'lucide-react';

import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function StageSidebar() {
  const {
    activeFile,
    busy,
    activeItem,
    activeFiles,
    canUpload,
    previewFile,
    handleFileUpload,
    handleDeleteFile,
  } = useDocumentsStudioContext();
  return (
    <div className="evidence-studio-sidebar">
      <div className="evidence-stage-card">
        <div className="evidence-stage-card-header">
          <div>
            <span className={`evidence-stage-badge ${activeItem.badgeClass}`}>
              {activeItem.stage} · {activeItem.role}
            </span>
            <h3 className="evidence-stage-title">{activeItem.title}</h3>
            <p className="evidence-stage-desc">{activeItem.desc}</p>
          </div>
          <Badge status={activeItem.chk.status || (activeFiles.length ? 'UPLOADED' : 'PENDING')} />
        </div>

        {/* Upload Dropzone */}
        {canUpload && (
          <label className="evidence-dropzone-studio" onClick={e => e.stopPropagation()}>
            <div className="evidence-dropzone-icon-wrap">
              <Upload size={20} />
            </div>
            <div className="evidence-dropzone-text">
              <strong>{busy ? 'Uploading file...' : `Upload Evidence ${activeItem.name}`}</strong>
              <span>Drag file here or click to select</span>
            </div>
            <span className="evidence-dropzone-hint">PDF, PNG, JPEG · Max. 20 MB</span>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              disabled={busy}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(activeItem, f);
                e.target.value = '';
              }}
            />
          </label>
        )}

        {/* Stage Files Deck */}
        <div className="evidence-files-section">
          <div className="evidence-files-header">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <h4>Uploaded Files ({activeFiles.length})</h4>
              <span className="evidence-files-summary">
                {activeFiles.length > 0 ? 'Select to preview' : 'No files yet'}
              </span>
            </div>
          </div>

          {activeFiles.length === 0 ? (
            <div className="evidence-files-empty">
              <FileText size={28} className="evidence-empty-icon" />
              <p>No files for the {activeItem.stage} stage</p>
              <small>Please upload supporting documents via the upload area above.</small>
            </div>
          ) : (
            <div className="evidence-files-list">
              {activeFiles.map((f: any) => {
                const isPreviewed = activeFile?.id === f.id;
                const isPdf = f.mimeType === 'application/pdf' || f.fileName?.toLowerCase().endsWith('.pdf');
                const sizeNum = Number(f.fileSize || 0);
                const sizeStr =
                  sizeNum > 1024 * 1024
                    ? `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`
                    : `${Math.max(1, Math.round(sizeNum / 1024))} KB`;
                const dateStr = f.createdAt
                  ? new Date(f.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';

                return (
                  <div
                    key={f.id}
                    className={`evidence-deck-card ${isPreviewed ? 'active' : ''}`}
                    onClick={() => previewFile(f)}
                    title="Click to open document preview"
                  >
                    <div className={`evidence-file-icon-box ${isPdf ? 'pdf' : 'img'}`}>
                      <FileText size={16} />
                      <span className="evidence-file-format-tag">{isPdf ? 'PDF' : 'IMG'}</span>
                    </div>
                    <div className="evidence-deck-card-info">
                      <div className="evidence-deck-filename" title={f.fileName}>
                        {f.fileName}
                      </div>
                      <div className="evidence-deck-meta">
                        <span>{sizeStr}</span>
                        {dateStr && (
                          <>
                            <span>•</span>
                            <span>{dateStr}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="evidence-deck-actions" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`evidence-action-btn ${isPreviewed ? 'active' : ''}`}
                        onClick={() => previewFile(f)}
                        title="Preview document"
                      >
                        <Eye size={13} />
                      </button>
                      {canUpload && (
                        <button
                          type="button"
                          className="evidence-action-btn danger"
                          onClick={() => handleDeleteFile(activeItem, f.id)}
                          title="Delete this file"
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
      </div>
    </div>
  );
}
