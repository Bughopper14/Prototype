/** Document Checklist tab: required documents per department with upload, view and status. */
import {ChecklistMetrics} from '@/features/documents/components/checklist/ChecklistMetrics';
import {ChecklistTable} from '@/features/documents/components/checklist/ChecklistTable';
import {ChecklistToolbar} from '@/features/documents/components/checklist/ChecklistToolbar';
import {DocumentPreviewModal} from '@/features/documents/components/checklist/DocumentPreviewModal';
import {useDocumentChecklist} from '@/features/documents/hooks/useDocumentChecklist';
import {ChecklistCustomizeDialog} from '@/features/documents/components/checklist/ChecklistCustomizeDialog';
import {hasAuthority} from '@/shared/lib/auth';
import {Settings2} from 'lucide-react';
import {useState} from 'react';
import {FileArchive, Loader2} from 'lucide-react';

export interface DocumentChecklistTabProps {
  application: any;
  draft: any;
  user: any;
  onChange: (updatedApp: any) => void;
  notify: (msg: string) => void;
}

export function DocumentChecklistTab({application, draft, user, onChange, notify}: DocumentChecklistTabProps) {
  const c = useDocumentChecklist({application, draft, user, onChange, notify});
  const [customizing, setCustomizing] = useState(false);
  const canCustomize = !draft?.isNew && !!application?.id && hasAuthority(user, 'CRM_DOCUMENT_UPLOAD');

  return (
    <div className="doc-checklist-container">
      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={c.fileInputRef}
        style={{display: 'none'}}
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={c.handleFileSelected}
      />

      <ChecklistMetrics stats={c.stats} />

      <section className="panel doc-checklist-panel">
        <div className="panel-head doc-checklist-head">
          <div>
            <h2>
              Document Checklist Matrix
              <span className="count-pill" style={{marginLeft: 8}}>
                {c.filteredRows.length} Documents
              </span>
            </h2>
            <p className="muted" style={{marginTop: 4}}>
              Matrix of required documents for this financing application. Documents automatically connected
              from other sections are locked for data integrity; files uploaded manually in this checklist
              can be deleted or replaced at any time.
            </p>
          </div>
          <div className="doc-head-actions">
            {canCustomize && (
              <button
                type="button"
                className="button doc-customize-btn"
                onClick={() => setCustomizing(true)}
              >
                <Settings2 size={15} /> Customize checklist
              </button>
            )}
            <button
              type="button"
              className="button primary doc-zip-btn"
              disabled={c.zipping || c.fileCount === 0}
              title={
                c.fileCount === 0
                  ? 'No files uploaded yet'
                  : `Download ${c.fileCount} files in a single ZIP, organized by stage`
              }
              onClick={c.handleDownloadAll}
            >
              {c.zipping ? <Loader2 size={15} className="spin" /> : <FileArchive size={15} />}
              <span>{c.zipping ? 'Preparing ZIP...' : 'Download All (ZIP)'}</span>
              {!c.zipping && c.fileCount > 0 && <span className="doc-zip-count">{c.fileCount}</span>}
            </button>
          </div>
        </div>

        <ChecklistToolbar
          searchTerm={c.searchTerm}
          setSearchTerm={c.setSearchTerm}
          selectedDept={c.selectedDept}
          setSelectedDept={c.setSelectedDept}
          departments={c.departments}
          selectedStatus={c.selectedStatus}
          setSelectedStatus={c.setSelectedStatus}
          stages={c.stages}
          selectedStage={c.selectedStage}
          setSelectedStage={c.setSelectedStage}
          grouped={c.grouped}
          setGrouped={c.changeView}
          toolbarRef={c.toolbarRef}
        />

        <ChecklistTable
          rows={c.filteredRows}
          grouped={c.grouped}
          collapsedStages={c.collapsedStages}
          onToggleStage={c.toggleStage}
          uploadingCode={c.uploadingCode}
          deletingFileId={c.deletingFileId}
          onPreview={c.handleOpenPreview}
          onUpload={c.handleTriggerUpload}
          onDelete={c.handleDeleteManualFile}
          onRequestApproval={c.canRequestApproval ? c.requestApproval : undefined}
          approvalBusy={c.approvalBusy}
        />
      </section>

      {customizing && (
        <ChecklistCustomizeDialog application={application} onChange={onChange} notify={notify} onClose={() => setCustomizing(false)} />
      )}


      {c.previewModal && (
        <DocumentPreviewModal preview={c.previewModal} onClose={() => c.setPreviewModal(null)} />
      )}
    </div>
  );
}
