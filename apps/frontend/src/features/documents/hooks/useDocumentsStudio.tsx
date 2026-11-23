/** All state, derived values and handlers of Documents; shared with its sections through DocumentsContext. */
import {hasAuthority} from '@/shared/lib/auth';
import {stageName, useMasterData} from '@/shared/master-data';
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
/** Document types shown as the evidence of each stage (FAP form, pre-analysis sheet, committee approval). */
const EVIDENCE_CODES = ['FAP', 'PREANALYSIS', 'ICLF'];
const BADGE_CLASS: Record<string, string> = {
  FAP: 'stage-badge-fap',
  PREANALYSIS: 'stage-badge-preanalysis',
  ICLF: 'stage-badge-iclf',
};

export function useDocumentsStudio({
  a,
  user,
  onChange,
  notify,
  filterStage,
  onApproveDocument,
  isFapLocked,
}: DocumentsProps) {
  const master = useMasterData();
  // The stage documents shown here; their title, department, description and stage come from Master Data.
  const evidenceDefs = EVIDENCE_CODES.map(code => {
    const doc = (master.documents || []).find(d => d.value === code);
    return {
      code,
      name: doc?.name || code,
      title: doc?.title || doc?.name || code,
      stageCode: doc?.stage || '',
      stage: stageName(doc?.stage),
      badgeClass: BADGE_CLASS[code],
      role: doc?.role || '',
      desc: doc?.description || '',
    };
  });

  const stageDocument = (stage?: string) => evidenceDefs.find(d => d.stageCode === stage)?.code;
  const defaultCode = stageDocument(filterStage) || evidenceDefs[0].code;
  const [selectedCode, setSelectedCode] = useState<string>(defaultCode);
  useEffect(() => {
    const code = stageDocument(filterStage);
    if (code) setSelectedCode(code);
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
    const chk = (a.documentChecks || []).find((d: any) => d.documentCode === def.code) || {
      documentCode: def.code,
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

  const canUpload = hasAuthority(user, 'CRM_DOCUMENT_UPLOAD');

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
