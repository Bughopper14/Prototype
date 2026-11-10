/** Document pane toolbar: upload, replace, scan, zoom. */
import {Trash2, Upload} from 'lucide-react';

import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function DocumentPaneToolbar() {
  const {editorLocked, docType, currentAsset, handleUploadDoc, handleRemoveDoc, docTitles} =
    useStakeholderModalContext();
  return (
    <div className="ktp-pane-topbar">
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
              onChange={e => handleUploadDoc(e, docType)}
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
    </div>
  );
}
