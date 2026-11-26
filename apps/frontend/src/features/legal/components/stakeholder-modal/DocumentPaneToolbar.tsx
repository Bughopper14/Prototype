/** Document pane toolbar: upload, replace, scan, zoom. */
import {useState} from 'react';
import {Trash2, Upload} from 'lucide-react';
import {ConfirmUploadBubble} from '@/shared/ui/ConfirmUploadBubble';

import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function DocumentPaneToolbar() {
  const {editorLocked, docType, currentAsset, handleUploadDoc, handleRemoveDoc, docTitles} =
    useStakeholderModalContext();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<any>(null);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.persist();
    if (currentAsset.url) {
      setPendingEvent(e);
      setConfirmOpen(true);
    } else {
      handleUploadDoc(e, docType);
    }
  };

  return (
    <div className="ktp-pane-topbar" style={{position: 'relative'}}>
      <div>
        <div style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px'}}>
          <h4 style={{margin: 0, fontSize: '14.5px', color: '#002060', fontWeight: 700}}>
            {docTitles[docType]}
          </h4>
          {currentAsset.url && (
            <span
              className="subtle-chip"
              style={{background: '#eff6ff', color: '#1d4ed8', fontSize: '10.5px', fontWeight: 600}}
            >
              ✓ Attached
            </span>
          )}
        </div>
        <span style={{fontSize: '11px', color: '#64748b'}}>
          Physical ID document preview & smart data extraction (OCR)
        </span>
      </div>

      {currentAsset.url && !editorLocked && (
        <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
          <label
            className="button small button-secondary"
            style={{
              padding: '4px 10px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Upload size={13} /> Replace File
            <input
              type="file"
              accept="image/*,application/pdf"
              style={{display: 'none'}}
              onChange={onFileInputChange}
            />
          </label>
          <button
            type="button"
            className="button small legal-delete-button"
            style={{padding: '4px 8px'}}
            onClick={handleRemoveDoc}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}

      <ConfirmUploadBubble
        open={confirmOpen}
        title="Are you sure?"
        message={`This ${docTitles[docType] || 'stakeholder'} document has already been attached. Uploading a new file will replace the current file and restart its approval process.`}
        onCancel={() => {
          setPendingEvent(null);
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (pendingEvent) {
            handleUploadDoc(pendingEvent, docType);
            setPendingEvent(null);
          }
          setConfirmOpen(false);
        }}
        placement="bottom"
      />
    </div>
  );
}
