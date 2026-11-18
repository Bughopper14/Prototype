/** State and actions of the Document Checklist: filters, upload, delete and preview. */
import {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {api} from '@/shared/lib/api';
import {markInView, restoreInView} from '@/features/documents/lib/keep-in-view';
import {downloadChecklistZip} from '@/features/documents/lib/download-zip';
import {buildChecklistRows} from '@/features/documents/lib/checklist/build-rows';
import {documentDefinitions} from '@/features/documents/lib/checklist/definitions';
import {useMasterData} from '@/shared/master-data';
import {hasAuthority} from '@/shared/lib/auth';
import {collectStakeholders} from '@/features/documents/lib/checklist/collect-stakeholders';
import {filterRows} from '@/features/documents/lib/checklist/filter-rows';
import {summarizeRows} from '@/features/documents/lib/checklist/summarize';
import type {ChecklistRow, PreviewState, StatusFilter} from '@/features/documents/lib/checklist/types';

export function useDocumentChecklist({
  application: a,
  draft,
  user,
  onChange,
  notify,
}: {
  application: any;
  draft: any;
  user: any;
  onChange: (updatedApp: any) => void;
  notify: (msg: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [zipping, setZipping] = useState(false);
  const [grouped, setGrouped] = useState(true);
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const [uploadingCode, setUploadingCode] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<PreviewState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUploadCode, setTargetUploadCode] = useState<string | null>(null);
  // Asking for the approval of one document (a document the workflow wants approved): the same people who may submit a stage
  const canRequestApproval = hasAuthority(user, 'crm_workflow_submit');
  const [approvalBusy, setApprovalBusy] = useState<string | null>(null);
  const requestApproval = async (row: ChecklistRow) => {
    if (!row.chkId) return;
    setApprovalBusy(row.chkId);
    try {
      onChange(await api(`/applications/${a.id}/documents/${row.chkId}/submit-approval`, 'POST', {}));
      notify(`${row.name} sent for approval`);
    } catch (e: any) {
      notify(e.message || 'Could not ask for approval');
    } finally {
      setApprovalBusy(null);
    }
  };

  const master = useMasterData();
  const definitions = useMemo(() => documentDefinitions(master), [master]);
  const allStakeholders = useMemo(() => collectStakeholders(a, draft), [a, draft]);
  const checklistRows = useMemo(
    () => buildChecklistRows(definitions, a, draft, allStakeholders),
    [definitions, a, draft, allStakeholders],
  );
  const stats = summarizeRows(checklistRows);
  // the departments the documents of this application have: the only ones the filter offers
  const departments = useMemo(() => [...new Set(checklistRows.map(r => r.department).filter(Boolean))].sort(), [checklistRows]);
  const filteredRows = useMemo(
    () => filterRows(checklistRows, searchTerm, selectedDept, selectedStatus, selectedStage),
    [checklistRows, searchTerm, selectedDept, selectedStatus, selectedStage],
  );
  /** Stages of the documents, in checklist order, for the stage filter. */
  const stages = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of checklistRows) if (r.stage && !seen.has(r.stage)) seen.set(r.stage, r.stageName || r.stage);
    return [...seen].map(([code, name]) => ({code, name}));
  }, [checklistRows]);
  /** Uploaded files of the whole checklist (what the ZIP holds), whatever the filters show. */
  const fileCount = useMemo(() => checklistRows.reduce((n, r) => n + r.files.length, 0), [checklistRows]);

  /** The toolbar stays where it is on screen when the table below grows or shrinks (view switch, group open/close). */
  const toolbarRef = useRef<HTMLDivElement>(null);
  const toolbarTop = useRef<number | null>(null);
  useLayoutEffect(() => {
    restoreInView(toolbarRef.current, toolbarTop.current);
    toolbarTop.current = null;
  }, [grouped, collapsedStages]);
  const changeView = (value: boolean) => {
    toolbarTop.current = markInView(toolbarRef.current);
    setGrouped(value);
  };

  const toggleStage = (code: string) => {
    toolbarTop.current = markInView(toolbarRef.current);
    setCollapsedStages(prev => {
      const next = new Set(prev);
      if (!next.delete(code)) next.add(code);
      return next;
    });
  };

  const handleDownloadAll = async () => {
    setZipping(true);
    try {
      const name = await downloadChecklistZip(a.id);
      notify(`${name} berhasil diunduh.`);
    } catch (err: any) {
      notify(`Gagal mengunduh ZIP: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setZipping(false);
    }
  };

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
    canRequestApproval,
    approvalBusy,
    requestApproval,
    searchTerm,
    setSearchTerm,
    selectedDept,
    setSelectedDept,
    departments,
    selectedStatus,
    setSelectedStatus,
    stages,
    selectedStage,
    setSelectedStage,
    grouped,
    changeView,
    toolbarRef,
    collapsedStages,
    toggleStage,
    fileCount,
    zipping,
    handleDownloadAll,
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
