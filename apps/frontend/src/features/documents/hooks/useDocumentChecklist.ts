/** State and actions of the Document Checklist: filters, upload, delete and preview. */
import {useCrm} from '@/features/crm/components/CrmProvider';
import {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {api} from '@/shared/lib/api';
import {markInView, restoreInView} from '@/features/documents/lib/keep-in-view';
import {downloadChecklistZip} from '@/features/documents/lib/download-zip';
import {buildChecklistRows} from '@/features/documents/lib/checklist/build-rows';
import {documentDefinitions} from '@/features/documents/lib/checklist/definitions';
import {storedFileUrl} from '@/features/documents/lib/checklist/file-url';
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
  const {confirm} = useCrm();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'ACTION_REQUIRED' | 'IN_REVIEW' | 'APPROVED' | 'MISSING'>('ALL');
  const [zipping, setZipping] = useState(false);
  const [grouped, setGrouped] = useState(true);
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const [uploadingCode, setUploadingCode] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<PreviewState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUpload, setTargetUpload] = useState<{code: string; chkId?: string} | null>(null);
  // Asking for the approval of one document (a document the workflow wants approved): the same people who may submit a stage
  const canRequestApproval = hasAuthority(user, 'CRM_WORKFLOW_SUBMIT');
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

  const isDocMissing = (r: ChecklistRow) => !r.isAvailable || r.files.length === 0;

  const isDocActionRequired = (r: ChecklistRow) => {
    // Only documents with an uploaded file can require an action; unuploaded docs belong to Missing Files
    if (isDocMissing(r)) return false;
    const app = r.check?.approval;
    if (!app) return false;
    return (
      app.state === 'NOT_STARTED' ||
      app.state === 'REJECTED' ||
      !!app.reopened ||
      !!app.canAct
    );
  };

  // In review = an approval round is running; a document without approval is never in review
  const isDocInReview = (r: ChecklistRow) => !isDocMissing(r) && r.check?.approval?.state === 'IN_APPROVAL';

  const isDocApproved = (r: ChecklistRow) => {
    if (isDocMissing(r)) return false;
    return r.check?.approvalStatus === 'APPROVED' || r.check?.approval?.state === 'APPROVED';
  };

  const pillCounts = useMemo(() => {
    return {
      all: checklistRows.length,
      actionRequired: checklistRows.filter(isDocActionRequired).length,
      inReview: checklistRows.filter(isDocInReview).length,
      approved: checklistRows.filter(isDocApproved).length,
      missing: checklistRows.filter(isDocMissing).length,
    };
  }, [checklistRows]);

  const filteredRows = useMemo(() => {
    let list = checklistRows;

    if (quickFilter === 'ACTION_REQUIRED') {
      list = list.filter(isDocActionRequired);
    } else if (quickFilter === 'IN_REVIEW') {
      list = list.filter(isDocInReview);
    } else if (quickFilter === 'APPROVED') {
      list = list.filter(isDocApproved);
    } else if (quickFilter === 'MISSING') {
      list = list.filter(isDocMissing);
    }

    return filterRows(list, searchTerm, selectedDept, selectedStatus, selectedStage);
  }, [checklistRows, quickFilter, searchTerm, selectedDept, selectedStatus, selectedStage]);
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
      notify(`${name} successfully downloaded.`);
    } catch (err: any) {
      notify(`Failed to download ZIP: ${err.message || 'An error occurred'}`);
    } finally {
      setZipping(false);
    }
  };

  // Handler Upload File
  const handleTriggerUpload = (code: string, chkId?: string) => {
    setTargetUpload({code, chkId});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // the FAP has one current signed file; every other document can have several (a KTP per stakeholder, several deeds)
    const picked = Array.from(e.target.files || []);
    if (!targetUpload || !picked.length) return;
    const {code: docCode, chkId} = targetUpload;
    const files = docCode === 'FAP' ? picked.slice(0, 1) : picked;
    if (!files.length) return;

    setUploadingCode(chkId || docCode);
    try {
      const row = chkId ? checklistRows.find(r => r.chkId === chkId) : checklistRows.find(r => r.code === docCode);
      const checklistId = chkId || row?.chkId || docCode;
      let done = 0;
      const failed: string[] = [];
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('checklistId', checklistId);
          formData.append('documentCode', docCode);
          await api(`/applications/${a.id}/documents/upload`, 'POST', formData);
          done++;
        } catch (err: any) {
          failed.push(`${file.name}: ${err.message || 'failed'}`);
        }
      }
      if (done) onChange(await api(`/applications/${a.id}`));
      if (failed.length) notify(`${done} files uploaded, ${failed.length} failed (${failed[0]})`);
      else notify(done > 1 ? `${done} files for ${docCode} successfully uploaded.` : `Document ${docCode} successfully uploaded.`);
    } catch (err: any) {
      notify(`Failed to upload document: ${err.message || 'An error occurred'}`);
    } finally {
      setUploadingCode(null);
      setTargetUpload(null);
    }
  };

  // Handler Delete File (Only manual files)
  const handleDeleteManualFile = async (fileId: string, docCode: string) => {
    const ok = await confirm({
      title: 'Delete document file?',
      message: 'Delete this file from Document Checklist? This action cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;

    setDeletingFileId(fileId);
    try {
      await api(`/applications/${a.id}/documents/files/${fileId}`, 'DELETE');
      const updatedApp = await api(`/applications/${a.id}`);
      onChange(updatedApp);
      notify(`Document file ${docCode} successfully deleted.`);
    } catch (err: any) {
      notify(`Failed to delete file: ${err.message || 'An error occurred'}`);
    } finally {
      setDeletingFileId(null);
    }
  };

  // Handler Preview File
  const handleOpenPreview = (row: ChecklistRow, chosen?: any) => {
    const file = chosen || row.files[0];
    const url = (!chosen && row.previewUrl) || storedFileUrl(file);
    if (!url) {
      notify('Physical document preview is not yet available for this item.');
      return;
    }
    const isPdf = url.toLowerCase().includes('.pdf') || file?.mimeType === 'application/pdf';
    setPreviewModal({
      title: `${row.code} · ${row.name}`,
      url,
      fileName: file?.fileName || `${row.code}_document`,
      isPdf,
      source: row.sourceLabel,
      fileSize: file?.fileSize,
      uploadedAt: file?.createdAt,
    });
  };

  return {
    quickFilter,
    setQuickFilter,
    pillCounts,
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
    checklistRows,
    filteredRows,
    handleTriggerUpload,
    handleFileSelected,
    handleDeleteManualFile,
    handleOpenPreview,
  };
}
