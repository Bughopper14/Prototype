/** All state, derived values and handlers of Documents; shared with its sections through DocumentsContext. */
import {checkIsAdmin, hasAuthority} from '@/shared/lib/auth';
import {useMasterData} from '@/shared/master-data';
import {useEffect, useMemo, useRef, useState} from 'react';

export type DocumentsProps = {
  a: any;
  user: any;
  onChange: (a: any) => void;
  notify: (s: string) => void;
  filterStage?: string;
  onApproveDocument?: (updatedApp?: any) => void;
  isFapLocked?: boolean;
};

import {useDocumentFileActions} from '@/features/documents/hooks/useDocumentFileActions';
import {useFapOcrPolling} from '@/features/documents/hooks/useFapOcrPolling';
import {useFapSectionNav} from '@/features/documents/hooks/useFapSectionNav';
import {useFapSheetData} from '@/features/documents/hooks/useFapSheetData';
export function useDocumentsStudio({
  a,
  user,
  onChange,
  notify,
  filterStage,
  onApproveDocument,
  isFapLocked,
}: DocumentsProps) {
  const evidenceDefs = [
    {
      code: 'FAP',
      name: 'fap',
      title: 'FAP (Financing Application Form)',
      stage: 'FAP Intake',
      badgeClass: 'stage-badge-fap',
      role: 'MKT',
      desc: 'Official signed financing application form from debtor',
    },
    {
      code: 'PREANALYSIS',
      name: 'Preanalysis',
      title: 'Pre-analysis Document',
      stage: 'Pre-analysis',
      badgeClass: 'stage-badge-preanalysis',
      role: 'CA',
      desc: 'Initial review and credit feasibility analysis by Credit Analyst',
    },
    {
      code: 'ICLF',
      name: 'Iclf',
      title: 'ICLF (Credit Committee Review)',
      stage: 'Credit Committee',
      badgeClass: 'stage-badge-iclf',
      role: 'COMMITTEE',
      desc: 'Approval recommendation and minutes of the financing committee meeting',
    },
  ];

  const defaultCode =
    filterStage === 'Pre-analysis' ? 'PREANALYSIS' : filterStage === 'ICLF' ? 'ICLF' : 'FAP';
  const [selectedCode, setSelectedCode] = useState<string>(defaultCode);
  useEffect(() => {
    if (filterStage === 'Pre-analysis') setSelectedCode('PREANALYSIS');
    else if (filterStage === 'ICLF') setSelectedCode('ICLF');
    else if (filterStage === 'FAP Stage') setSelectedCode('FAP');
  }, [filterStage]);

  const [activeFileUrl, setActiveFileUrl] = useState<string>('');
  const [activeFile, setActiveFile] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pdfZoom, setPdfZoom] = useState<string>('FitH');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const [fapComparison, setFapComparison] = useState<any>(null);
  const [fapRemarks, setFapRemarks] = useState<string>('');
  const [remarksSaveStatus, setRemarksSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const [confirmApproveFapOpen, setConfirmApproveFapOpen] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [rightViewMode, setRightViewMode] = useState<'ocr' | 'pdf'>('ocr');
  const [isFapOcrScanning, setIsFapOcrScanning] = useState<boolean>(false);
  const [systemZoom, setSystemZoom] = useState<number>(0.15);
  const [autoFitSystem, setAutoFitSystem] = useState<boolean>(true);
  const fapComparisonContainerRef = useRef<HTMLDivElement>(null);

  const handleFitBothDocuments = () => {
    if (fapComparisonContainerRef.current) {
      const containerW = fapComparisonContainerRef.current.clientWidth;
      const colW = (containerW - 24) / 2;
      const target = Math.max(0.1, Math.min(0.25, Number(((colW - 32) / 3940).toFixed(2))));
      setSystemZoom(target);
    } else {
      setSystemZoom(0.15);
    }
  };

  useEffect(() => {
    if (selectedCode === 'FAP') {
      handleFitBothDocuments();
      const handleResize = () => {
        if (fapComparisonContainerRef.current) {
          const containerW = fapComparisonContainerRef.current.clientWidth;
          const colW = (containerW - 24) / 2;
          if (colW > 200) {
            const target = Math.max(0.1, Math.min(0.25, Number(((colW - 32) / 3940).toFixed(2))));
            setSystemZoom(target);
          }
        }
      };
      window.addEventListener('resize', handleResize);
      const t = setTimeout(handleFitBothDocuments, 200);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(t);
      };
    }
  }, [selectedCode]);
  const [fapNavFilter, setFapNavFilter] = useState<string>('all');
  const [fapNavTick, setFapNavTick] = useState<number>(() => Date.now());
  const master = useMasterData();
  const {sectionFieldMap, fapSectionTitles, filteredDiffs, scrollToFapField, scrollToFapSection} =
    useFapSectionNav({
      setActiveFileUrl,
      setActiveFile,
      fapComparison,
      setFapComparison,
      setFapRemarks,
      setRemarksSaveStatus,
      setShowHistoryModal,
      setRightViewMode,
      fapNavFilter,
      setFapNavFilter,
      setFapNavTick,
      a,
    });

  const items = evidenceDefs.map(def => {
    const chk = (a.documentChecks || []).find(
      (d: any) =>
        String(d.documentCode).toUpperCase() === def.code ||
        String(d.documentName).toLowerCase() === def.name.toLowerCase(),
    ) || {
      id: `demo-doc-${a.id}-${def.code}`,
      documentCode: def.code,
      documentName: def.name,
      assignedRole: def.role,
      status: 'PENDING',
      files: [],
    };
    return {...def, chk};
  });

  const totalFilesCount = items.reduce((sum, item) => sum + (item.chk.files?.length || 0), 0);
  const activeItem = items.find(x => x.code === selectedCode) || items[0];
  const activeFiles = activeItem.chk.files || [];

  const pdfViewerSrc = useMemo(() => {
    if (!activeFileUrl || activeFile?.mimeType !== 'application/pdf') return activeFileUrl;
    const base = activeFileUrl.split('#')[0];
    const zoomParam = pdfZoom === 'FitH' ? 'view=FitH' : pdfZoom === 'Fit' ? 'view=Fit' : `zoom=${pdfZoom}`;
    return `${base}#toolbar=1&navpanes=0&${zoomParam}`;
  }, [activeFileUrl, activeFile?.mimeType, pdfZoom]);

  const canUpload = hasAuthority(user, 'crm_upload_app_documents');

  // Automatically preview latest file if available and none selected
  useEffect(() => {
    if (activeFiles.length > 0) {
      if (!activeFile || !activeFiles.some((f: any) => f.id === activeFile.id)) {
        previewFile(activeFiles[activeFiles.length - 1]);
      }
    } else {
      setActiveFile(null);
      setActiveFileUrl('');
    }
  }, [selectedCode, activeFiles.length]);
  useFapOcrPolling({
    selectedCode,
    setFapComparison,
    setFapRemarks,
    setRemarksSaveStatus,
    setIsFapOcrScanning,
    activeFiles,
    a,
  });
  const {liveFapData, ocrFapData} = useFapSheetData({fapComparison, master, a});
  const {
    previewFile,
    handleFileUpload,
    handleDeleteFile,
    handleSaveFapRemarks,
    handleApproveFapChanges,
    handleDismissFapChanges,
    handleRunFapComparison,
  } = useDocumentFileActions({
    setActiveFileUrl,
    activeFile,
    setActiveFile,
    setZoom,
    setRotation,
    setBusy,
    setError,
    setFapComparison,
    fapRemarks,
    setRemarksSaveStatus,
    setRightViewMode,
    setIsFapOcrScanning,
    a,
    onChange,
    notify,
    onApproveDocument,
  });

  return {
    a,
    user,
    onChange,
    notify,
    filterStage,
    onApproveDocument,
    isFapLocked,
    evidenceDefs,
    defaultCode,
    selectedCode,
    setSelectedCode,
    activeFileUrl,
    setActiveFileUrl,
    activeFile,
    setActiveFile,
    zoom,
    setZoom,
    rotation,
    setRotation,
    busy,
    setBusy,
    error,
    setError,
    pdfZoom,
    setPdfZoom,
    sidebarCollapsed,
    setSidebarCollapsed,
    isMaximized,
    setIsMaximized,
    fapComparison,
    setFapComparison,
    fapRemarks,
    setFapRemarks,
    remarksSaveStatus,
    setRemarksSaveStatus,
    confirmApproveFapOpen,
    setConfirmApproveFapOpen,
    showHistoryModal,
    setShowHistoryModal,
    rightViewMode,
    setRightViewMode,
    isFapOcrScanning,
    setIsFapOcrScanning,
    systemZoom,
    setSystemZoom,
    autoFitSystem,
    setAutoFitSystem,
    fapComparisonContainerRef,
    handleFitBothDocuments,
    fapNavFilter,
    setFapNavFilter,
    fapNavTick,
    setFapNavTick,
    master,
    sectionFieldMap,
    fapSectionTitles,
    filteredDiffs,
    scrollToFapField,
    scrollToFapSection,
    items,
    totalFilesCount,
    activeItem,
    activeFiles,
    pdfViewerSrc,
    canUpload,
    liveFapData,
    ocrFapData,
    previewFile,
    handleFileUpload,
    handleDeleteFile,
    handleSaveFapRemarks,
    handleApproveFapChanges,
    handleDismissFapChanges,
    handleRunFapComparison,
  };
}
