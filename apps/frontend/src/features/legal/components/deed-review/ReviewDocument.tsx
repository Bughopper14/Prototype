/** The deed document: choose or upload it and view it. */
import {ExternalLink, FileText, Upload} from 'lucide-react';
import {api} from '@/shared/lib/api';

export function ReviewDocument({
  application,
  deed,
  canSubmit,
  busy,
  documentId,
  setDocumentId,
  url,
  files,
  setError,
  setBusy,
  checklist,
  onUpdated,
}: {
  application: any;
  deed: any;
  canSubmit: boolean;
  busy: boolean;
  documentId: string;
  setDocumentId: (v: string) => void;
  url: string;
  files: any[];
  setError: (v: string) => void;
  setBusy: (v: boolean) => void;
  checklist: any;
  onUpdated: (a: any) => void;
}) {
  return (
    <>
      <h3>Deed document (optional)</h3>
      {canSubmit && (
        <div className="deed-review-document-picker">
          <label>
            Select document to submit
            <select
              aria-label="Deed document"
              value={documentId}
              disabled={busy}
              onChange={e => {
                setError('');
                setDocumentId(e.target.value);
              }}
            >
              <option value="">No attachment</option>
              {files.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.fileName}
                </option>
              ))}
            </select>
          </label>
          <label className="button small upload-label">
            <Upload size={14} />
            {busy ? 'Uploading...' : 'Upload document'}
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              disabled={busy || !checklist}
              onChange={async e => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy(true);
                setError('');
                try {
                  const data = new FormData();
                  data.append('checklistId', checklist.id);
                  data.append('file', f);
                  const saved = await api(`/applications/${application.id}/documents/upload`, 'POST', data);
                  onUpdated(await api(`/applications/${application.id}`));
                  setDocumentId(saved.id);
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                  e.target.value = '';
                }
              }}
            />
          </label>
        </div>
      )}
      {documentId ? (
        <>
          <div className="deed-review-file-name">
            <FileText size={16} />
            {files.find((f: any) => f.id === documentId)?.fileName || 'Deed document'}
            {url && (
              <a className="text-link" href={url} target="_blank" rel="noreferrer">
                Open document
                <ExternalLink size={13} />
              </a>
            )}
          </div>
          {url && (
            <div className="deed-review-preview">
              {files.find((f: any) => f.id === documentId)?.mimeType === 'application/pdf' ? (
                <iframe title="Deed document preview" src={url} />
              ) : (
                <img src={url} alt="Deed document" />
              )}
            </div>
          )}
        </>
      ) : (
        <p className="muted">No attachment. The deed can still be submitted, verified, and approved.</p>
      )}
    </>
  );
}
