/** Document Checklist tab: required documents per department with upload, view and status. */
import {ChecklistMetrics} from '@/features/documents/components/checklist/ChecklistMetrics';
import {ChecklistTable} from '@/features/documents/components/checklist/ChecklistTable';
import {ChecklistToolbar} from '@/features/documents/components/checklist/ChecklistToolbar';
import {DocumentPreviewModal} from '@/features/documents/components/checklist/DocumentPreviewModal';
import {useDocumentChecklist} from '@/features/documents/hooks/useDocumentChecklist';

export interface DocumentChecklistTabProps {
  application: any;
  draft: any;
  user: any;
  onChange: (updatedApp: any) => void;
  notify: (msg: string) => void;
}

export function DocumentChecklistTab({application, draft, onChange, notify}: DocumentChecklistTabProps) {
  const c = useDocumentChecklist({application, draft, onChange, notify});

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
                {c.filteredRows.length} Dokumen
              </span>
            </h2>
            <p className="muted" style={{marginTop: 4}}>
              Matriks ketersediaan dokumen persyaratan pengajuan pembiayaan. Dokumen yang terhubung otomatis
              dari section lain terkunci demi integritas data; berkas yang diunggah manual di checklist ini
              dapat dihapus dan diganti kapan saja.
            </p>
          </div>
        </div>

        <ChecklistToolbar
          searchTerm={c.searchTerm}
          setSearchTerm={c.setSearchTerm}
          selectedDept={c.selectedDept}
          setSelectedDept={c.setSelectedDept}
          selectedStatus={c.selectedStatus}
          setSelectedStatus={c.setSelectedStatus}
        />

        <ChecklistTable
          rows={c.filteredRows}
          uploadingCode={c.uploadingCode}
          deletingFileId={c.deletingFileId}
          onPreview={c.handleOpenPreview}
          onUpload={c.handleTriggerUpload}
          onDelete={c.handleDeleteManualFile}
        />
      </section>

      {c.previewModal && (
        <DocumentPreviewModal preview={c.previewModal} onClose={() => c.setPreviewModal(null)} />
      )}
    </div>
  );
}
