/** Studio title, file count and the stage pill navigation. */
import {CheckCircle, FolderCheck} from 'lucide-react';

import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function StudioHeader() {
  const {a, selectedCode, setSelectedCode, items, totalFilesCount} = useDocumentsStudioContext();
  return (
    <div className="evidence-studio-header">
      <div className="evidence-studio-title-area">
        <div className="evidence-studio-badge">
          <FolderCheck size={14} /> Studio Evidence
        </div>
        <h2>Evidence Files & Live Document Studio</h2>
        <p>
          Digital document management for financing application of debtor{' '}
          <strong>{a.customer?.companyName || 'Debtor'}</strong> ({a.fapNumber || 'FAP'}) ·{' '}
          <strong>{totalFilesCount} Files Uploaded</strong>
        </p>
      </div>

      {/* Linear/Prolab Segmented Pill Navigation */}
      <div className="evidence-pill-nav" role="tablist" aria-label="Document Stage Navigation">
        {items.map(item => {
          const isSelected = item.code === selectedCode;
          const count = item.chk.files?.length || 0;
          const isDone = item.chk.status === 'VERIFIED' || count > 0;
          return (
            <button
              key={item.code}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`evidence-pill-btn ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedCode(item.code)}
            >
              <span className="evidence-pill-label">{item.stage}</span>
              <span className="evidence-pill-role">{item.role}</span>
              <span className={`evidence-pill-count ${count > 0 ? 'has-files' : ''}`}>{count}</span>
              {isDone && <CheckCircle size={13} className="evidence-pill-done-icon" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
