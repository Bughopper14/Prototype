/** Evidence viewer: file name and context bar. */
import {Badge} from '@/shared/ui/Badge';
import {Columns} from 'lucide-react';

import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function ViewerHead() {
  const {activeFile, sidebarCollapsed, setSidebarCollapsed, activeItem, activeFiles} =
    useDocumentsStudioContext();
  return (
    <div className="document-viewer-studio-head">
      <div className="document-viewer-head-info">
        {sidebarCollapsed && (
          <button
            type="button"
            className="button small studio-expand-btn"
            onClick={() => setSidebarCollapsed(false)}
            title="Show file sidebar again"
          >
            <Columns size={13} /> Open Sidebar
          </button>
        )}
        <div>
          <h3 className="document-viewer-title">
            {activeFile ? activeFile.fileName : `Document Preview · ${activeItem.title}`}
          </h3>
          <span className="document-viewer-subtitle">
            Stage: <strong>{activeItem.stage}</strong> · Role: <strong>{activeItem.role}</strong>
          </span>
        </div>
      </div>
      <div className="document-viewer-head-status">
        <Badge status={activeItem.chk.status || (activeFiles.length ? 'UPLOADED' : 'PENDING')} />
      </div>
    </div>
  );
}
