/** State and actions of the Document Checklist: filters, upload, delete and preview. */
import {useMemo, useRef, useState} from 'react';
import {api} from '@/shared/lib/api';
import {buildChecklistRows} from '@/features/documents/lib/checklist/build-rows';
import {collectStakeholders} from '@/features/documents/lib/checklist/collect-stakeholders';
import {filterRows} from '@/features/documents/lib/checklist/filter-rows';
import {summarizeRows} from '@/features/documents/lib/checklist/summarize';
import type {ChecklistRow, PreviewState, StatusFilter} from '@/features/documents/lib/checklist/types';

export function useDocumentChecklist({
  application: a,
  draft,
  onChange,
  notify,
}: {
  application: any;
  draft: any;
  onChange: (updatedApp: any) => void;
  notify: (msg: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('ALL');
  const [uploadingCode, setUploadingCode] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<PreviewState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUploadCode, setTargetUploadCode] = useState<string | null>(null);

  const allStakeholders = useMemo(() => collectStakeholders(a, draft), [a, draft]);
  const checklistRows = useMemo(
    () => buildChecklistRows(a, draft, allStakeholders),
    [a, draft, allStakeholders],
  );
  const stats = summarizeRows(checklistRows);
  const filteredRows = useMemo(
    () => filterRows(checklistRows, searchTerm, selectedDept, selectedStatus),
    [checklistRows, searchTerm, selectedDept, selectedStatus],
  );

  // Handler Upload File
  const handleTriggerUpload = (code: string) => {
    setTargetUploadCode(code);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUploadCode) return;

    setUploadingCode(targetUploadCode);
    try {
      const row = checklistRows.find(r => r.code === targetUploadCode);
      const checklistId = row?.chkId || targetUploadCode;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('checklistId', checklistId);
      formData.append('documentCode', targetUploadCode);

      await api(`/applications/${a.id}/documents/upload`, 'POST', formData);
      const updatedApp = await api(`/applications/${a.id}`);
      onChange(updatedApp);
      notify(`Dokumen ${targetUploadCode} berhasil diunggah.`);
    } catch (err: any) {
      notify(`Gagal mengunggah dokumen: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setUploadingCode(null);
      setTargetUploadCode(null);
    }
  };

  // Handler Delete File (Only manual files)
  const handleDeleteManualFile = async (fileId: string, docCode: string) => {
    if (!window.confirm(`Hapus berkas ini dari Document Checklist? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setDeletingFileId(fileId);
    try {
      await api(`/applications/${a.id}/documents/files/${fileId}`, 'DELETE');
      const updatedApp = await api(`/applications/${a.id}`);
      onChange(updatedApp);
      notify(`Berkas dokumen ${docCode} berhasil dihapus.`);
    } catch (err: any) {
      notify(`Gagal menghapus berkas: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setDeletingFileId(null);
    }
  };

  // Handler Preview File
  const handleOpenPreview = (row: ChecklistRow) => {
    const url = row.previewUrl || (row.files[0] ? `/documents/${row.files[0].fileName}` : '');
    if (!url) {
      notify('Pratinjau fisik dokumen belum tersedia untuk item ini.');
      return;
    }
    const isPdf = url.toLowerCase().endsWith('.pdf') || row.files[0]?.mimeType === 'application/pdf';
    setPreviewModal({
      title: `${row.code} · ${row.name}`,
      url,
      fileName: row.files[0]?.fileName || `${row.code}_document`,
      isPdf,
      source: row.sourceLabel,
      fileSize: row.files[0]?.fileSize,
      uploadedAt: row.files[0]?.createdAt,
    });
  };

  return {
    searchTerm,
    setSearchTerm,
    selectedDept,
    setSelectedDept,
    selectedStatus,
    setSelectedStatus,
    uploadingCode,
    deletingFileId,
    previewModal,
    setPreviewModal,
    fileInputRef,
    stats,
    filteredRows,
    handleTriggerUpload,
    handleFileSelected,
    handleDeleteManualFile,
    handleOpenPreview,
  };
}
