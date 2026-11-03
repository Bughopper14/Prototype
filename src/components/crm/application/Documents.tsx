import {FapSheetPreview} from '@/components/crm/lazy';
import {Editor} from '@tinymce/tinymce-react';
import {useEffect, useState, useRef, useMemo} from 'react';
import {Eye, Sparkles, Files, FolderCheck, Download, Pencil, FileText, AlertTriangle, Upload, UploadCloud, RefreshCw, RotateCw, ZoomIn, ZoomOut, ExternalLink, Save, Trash2, Loader2, Columns, FileSpreadsheet, Lock, Printer, CheckCircle, Maximize2, Minimize2} from 'lucide-react';
import {printFapDocument, type FapSheetData, SECTION_TO_CELL_IDS_MAP, SECTION_TO_SCROLL_TARGET_MAP, FIELD_TO_CELL_ID_MAP} from '@/lib/crm/fap-cells';
import {api} from '@/lib/crm/api';
import {useMasterData} from '@/components/crm/master-data/master-data';
import {type Field, label} from '@/lib/shared/fields';
import {date, calculateAgeYearsMonths} from '@/lib/crm/format';
import {Badge, Modal} from '@/components/crm/common/ui';
import {checkIsAdmin} from '@/lib/crm/auth';
import {FapRemarksTinyMCE} from '@/components/crm/application/FapComparisonModal';

export function Documents({a,user,onChange,notify,filterStage,onApproveDocument,isFapLocked}:{a:any,user:any,onChange:(a:any)=>void,notify:(s:string)=>void,filterStage?:string,onApproveDocument?:(updatedApp?:any)=>void,isFapLocked?:boolean}){
  const evidenceDefs = [
    { code: 'FAP', name: 'fap', title: 'FAP (Financing Application Form)', stage: 'FAP Intake', badgeClass: 'stage-badge-fap', role: 'MKT', desc: 'Official signed financing application form from debtor' },
    { code: 'PREANALYSIS', name: 'Preanalysis', title: 'Pre-analysis Document', stage: 'Pre-analysis', badgeClass: 'stage-badge-preanalysis', role: 'CA', desc: 'Initial review and credit feasibility analysis by Credit Analyst' },
    { code: 'ICLF', name: 'Iclf', title: 'ICLF (Credit Committee Review)', stage: 'Credit Committee', badgeClass: 'stage-badge-iclf', role: 'COMMITTEE', desc: 'Approval recommendation and minutes of the financing committee meeting' },
  ];

  const defaultCode = filterStage === 'Pre-analysis' ? 'PREANALYSIS' : filterStage === 'ICLF' ? 'ICLF' : 'FAP';
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
      const target = Math.max(0.10, Math.min(0.25, Number(((colW - 32) / 3940).toFixed(2))));
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
            const target = Math.max(0.10, Math.min(0.25, Number(((colW - 32) / 3940).toFixed(2))));
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

  const sectionFieldMap: Record<string, string[]> = {
    'fap-preview-sec-header': [
      'fapNumber', 'applicationDate', 'customerCategory', 'customerStatus',
      'companyName', 'companyType', 'nib', 'nibDate', 'npwp',
      'establishmentActNo', 'establishmentDate'
    ],
    'fap-preview-sec-company': [
      'branchCode', 'customerStatus', 'locationStatus', 'companyAddress',
      'province', 'city', 'district', 'village', 'postalCode', 'rt', 'rw',
      'phoneFax', 'email', 'website'
    ],
    'fap-preview-sec-business': [
      'mainBusiness', 'repaymentSource', 'industrySegment', 'businessRole',
      'experienceYears', 'experienceMonths', 'latestDeedNo', 'latestDeedDate'
    ],
    'fap-preview-sec-pic': [
      'picName', 'position', 'phone', 'email', 'picEmail', 'picAddress',
      'currentAddress', 'picCity', 'picProvince', 'picPostalCode',
      'representativeType', 'idNumber'
    ],
    'fap-preview-sec-projects': [
      'shareholders', 'stakeholderType', 'projectName', 'projectOwner',
      'projectValue', 'contractNumber', 'projects'
    ]
  };

  const fapSectionTitles: Record<string, string> = {
    'fap-preview-sec-header': '1. Identity',
    'fap-preview-sec-company': '2. Domicile',
    'fap-preview-sec-business': '3. Profile',
    'fap-preview-sec-pic': '4. PIC',
    'fap-preview-sec-projects': '5. Projects'
  };

  const filteredDiffs = useMemo(() => {
    if (!fapComparison?.diffs) return [];
    if (fapNavFilter === 'all') return fapComparison.diffs;
    const allowed = sectionFieldMap[fapNavFilter] || [];
    return fapComparison.diffs.filter((d: any) => allowed.includes(d.field));
  }, [fapComparison, fapNavFilter]);

  // Reset state when switching application to prevent cross-application data leakage
  useEffect(() => {
    setActiveFile(null);
    setActiveFileUrl('');
    setFapComparison(null);
    setFapRemarks('');
    setRemarksSaveStatus('idle');
    setShowHistoryModal(false);
    setRightViewMode('ocr');
    setFapNavFilter('all');
  }, [a.id]);

  const scrollToFapField = (fieldKey: string) => {
    const el = document.getElementById(`fap-diff-cell-${fieldKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('fap-preview-sync-highlight');
      void el.offsetWidth;
      el.classList.add('fap-preview-sync-highlight');
      setTimeout(() => {
        el.classList.remove('fap-preview-sync-highlight');
      }, 2500);
    }

    const cellId = FIELD_TO_CELL_ID_MAP[fieldKey];
    if (cellId) {
      const iframes = document.querySelectorAll<HTMLIFrameElement>('.fap-pane-card iframe');
      iframes.forEach(iframe => {
        try {
          const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
          const win = iframe.contentWindow;
          if (!iDoc || !win) return;
          const targetEl = iDoc.getElementById(cellId);
          if (targetEl) {
            targetEl.classList.remove('fap-cell-highlight');
            void targetEl.offsetWidth;
            targetEl.classList.add('fap-cell-highlight');
            const rect = targetEl.getBoundingClientRect();
            const currentScrollY = win.scrollY || iDoc.documentElement.scrollTop || iDoc.body.scrollTop || 0;
            const targetY = Math.max(0, currentScrollY + rect.top - 80);
            win.scrollTo({ top: targetY, behavior: 'smooth' });
            iDoc.documentElement.scrollTo({ top: targetY, behavior: 'smooth' });
            iDoc.body.scrollTo({ top: targetY, behavior: 'smooth' });
            setTimeout(() => targetEl.classList.remove('fap-cell-highlight'), 3000);
          }
        } catch {}
      });
    }
  };

  const scrollToFapSection = (secId: string) => {
    setFapNavFilter(secId);
    setFapNavTick(Date.now());

    // Scroll and highlight inside both iframes within .fap-pane-card (System FAP & OCR FAP)
    const iframes = document.querySelectorAll<HTMLIFrameElement>('.fap-pane-card iframe');
    iframes.forEach(iframe => {
      try {
        const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const win = iframe.contentWindow;
        if (!iDoc || !win) return;

        // Clear existing highlights
        iDoc.querySelectorAll('.fap-cell-highlight, .fap-section-highlight').forEach(el => {
          el.classList.remove('fap-cell-highlight', 'fap-section-highlight');
        });

        if (secId === 'all') {
          win.scrollTo({ top: 0, behavior: 'smooth' });
          iDoc.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
          iDoc.body.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const sectionCells = SECTION_TO_CELL_IDS_MAP[secId] || [];
        sectionCells.forEach(cid => {
          const cel = iDoc.getElementById(cid);
          if (cel) cel.classList.add('fap-cell-highlight');
        });

        const targetCellId = SECTION_TO_SCROLL_TARGET_MAP[secId] || sectionCells[0];
        if (targetCellId) {
          const targetEl = iDoc.getElementById(targetCellId);
          if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            const currentScrollY = win.scrollY || iDoc.documentElement.scrollTop || iDoc.body.scrollTop || 0;
            const targetY = Math.max(0, currentScrollY + rect.top - 60);
            win.scrollTo({ top: targetY, behavior: 'smooth' });
            iDoc.documentElement.scrollTo({ top: targetY, behavior: 'smooth' });
            iDoc.body.scrollTo({ top: targetY, behavior: 'smooth' });
          }
        }

        setTimeout(() => {
          sectionCells.forEach(cid => {
            const cel = iDoc.getElementById(cid);
            if (cel) cel.classList.remove('fap-cell-highlight');
          });
        }, 3200);
      } catch (err) {
        console.warn('Could not scroll iframe section:', err);
      }
    });
  };

  const items = evidenceDefs.map(def => {
    const chk = (a.documentChecks || []).find((d: any) => 
      String(d.documentCode).toUpperCase() === def.code || 
      String(d.documentName).toLowerCase() === def.name.toLowerCase()
    ) || {
      id: `demo-doc-${a.id}-${def.code}`,
      documentCode: def.code,
      documentName: def.name,
      assignedRole: def.role,
      status: 'PENDING',
      files: []
    };
    return { ...def, chk };
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

  const canUpload = checkIsAdmin(user) || ['MKT','BS','HEAD_BS','CA','LEGAL','COMMITTEE'].includes(user.role);

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

  // Load existing FAP comparison from backend on stage switch or when files change
  useEffect(() => {
    let isCancelled = false;
    let pollTimer: any = null;

    if (selectedCode === 'FAP' && activeFiles.length > 0) {
      api(`/applications/${a.id}/fap-comparison`).then(res => {
        if (isCancelled) return;
        const comp = res?.comparison;
        setFapComparison(comp || null);
        if (comp?.remarks) {
          setFapRemarks(comp.remarks);
          setRemarksSaveStatus('saved');
        } else {
          setFapRemarks('');
          setRemarksSaveStatus('idle');
        }

        if (comp && (!comp.extractedData || Object.keys(comp.extractedData).length === 0 || comp.status === 'processing')) {
          setIsFapOcrScanning(true);
          let attempts = 0;
          pollTimer = setInterval(async () => {
            if (isCancelled) {
              clearInterval(pollTimer);
              return;
            }
            attempts++;
            try {
              const compRes = await api(`/applications/${a.id}/fap-comparison`);
              const c = compRes?.comparison;
              if (c && c.extractedData && Object.keys(c.extractedData).length > 0) {
                clearInterval(pollTimer);
                if (!isCancelled) {
                  setFapComparison(c);
                  setIsFapOcrScanning(false);
                }
              } else if (attempts >= 45) {
                clearInterval(pollTimer);
                if (!isCancelled) setIsFapOcrScanning(false);
              }
            } catch {
              if (attempts >= 45) {
                clearInterval(pollTimer);
                if (!isCancelled) setIsFapOcrScanning(false);
              }
            }
          }, 2000);
        } else {
          setIsFapOcrScanning(false);
        }
      }).catch(() => {
        if (!isCancelled) {
          setFapComparison(null);
          setFapRemarks('');
          setRemarksSaveStatus('idle');
          setIsFapOcrScanning(false);
        }
      });
    } else {
      setFapComparison(null);
      setFapRemarks('');
      setRemarksSaveStatus('idle');
      setIsFapOcrScanning(false);
    }

    return () => {
      isCancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [selectedCode, a.id, activeFiles.length]);

  const liveFapData: FapSheetData = useMemo(() => {
    const docPic = a.pic || a.customer?.pic || {};
    const estDate = a.customer?.establishmentDate || a.establishmentDate || '';
    const autoExp = estDate ? calculateAgeYearsMonths(estDate) : null;
    const finalExpYears = (a.customer?.experienceYears != null && a.customer?.experienceYears !== '')
      ? a.customer.experienceYears
      : (a.experienceYears != null && a.experienceYears !== '')
        ? a.experienceYears
        : (autoExp ? autoExp.years : '');
    const finalExpMonths = (a.customer?.experienceMonths != null && a.customer?.experienceMonths !== '')
      ? a.customer.experienceMonths
      : (a.experienceMonths != null && a.experienceMonths !== '')
        ? a.experienceMonths
        : (autoExp ? autoExp.months : '');

    return {
      fapNumber: a.fapNumber || '-',
      applicationDate: a.applicationDate || new Date().toISOString(),
      branchCode: a.branchCode || a.profile?.branchCode || '',
      customerStatus: a.customerCategory || a.profile?.customerStatus || 'EXISTING',
      companyName: a.customer?.companyName || a.companyName || '',
      companyType: a.customer?.companyType || a.companyType || 'PT',
      nib: a.customer?.nib || a.nib || '',
      nibDate: a.customer?.nibDate || a.nibDate || '',
      npwp: a.customer?.npwp || a.npwp || '',
      establishmentActNo: a.customer?.establishmentActNo || a.establishmentActNo || '',
      establishmentDate: a.customer?.establishmentDate || a.establishmentDate || '',
      companyAddress: a.customer?.companyAddress || a.companyAddress || '',
      city: a.customer?.city || a.city || '',
      province: a.customer?.province || a.province || '',
      postalCode: a.customer?.postalCode || a.postalCode || '',
      experienceYears: finalExpYears,
      experienceMonths: finalExpMonths,
      mainBusiness: a.mainBusiness || a.customer?.mainBusiness || '',
      latestDeedNo: a.latestDeedNo || '',
      latestDeedDate: a.latestDeedDate || '',
      phoneFax: a.phoneFax || '',
      website: a.website || '',
      email: a.email || '',
      repaymentSource: a.repaymentSource || '',
      locationStatus: a.locationStatus || '',
      pic: docPic,
      picName: docPic.picName || docPic.name || a.picName || '',
      position: docPic.position || a.position || '',
      phone: docPic.phone || docPic.mobilePhone || a.phone || '',
      picEmail: docPic.email || docPic.picEmail || a.picEmail || '',
      currentAddress: docPic.currentAddress || docPic.address || a.currentAddress || '',
      picCity: master.city?.find(x => x.value === docPic.city || x.name?.toLowerCase() === String(docPic.city || '').toLowerCase())?.name || docPic.city || a.picCity || '',
      picProvince: master.province?.find(x => x.value === docPic.province || x.name?.toLowerCase() === String(docPic.province || '').toLowerCase())?.name || docPic.province || a.picProvince || '',
      picPostalCode: docPic.postalCode || a.picPostalCode || '',
      selectedDeedNo: a.selectedDeedNo || a.customer?.establishmentActNo || '',
      stakeholders: a.stakeholders || [],
      facilityPurpose: a.proposal?.facilityPurpose || a.facilityPurpose || 'INVESTMENT',
      financingMethod: a.proposal?.financingMethod || a.financingMethod || '',
      financingValue: a.proposal?.financingValue || a.financingValue || '',
      downPaymentValue: a.proposal?.downPaymentValue || a.downPaymentValue || '',
      interestRate: a.proposal?.interestRate || a.interestRate || '',
      tenorMonths: a.proposal?.tenorMonths || a.tenorMonths || '',
      paymentMethod: a.proposal?.paymentMethod || a.paymentMethod || 'In Arrear',
      industrySegment: a.industrySegment || '',
      businessRole: a.businessRole || '',
      proposal: a.proposal || {},
      projects: a.projects || [],
      bankReferences: a.bankReferences || [],
      financialStatements: a.financialStatements || []
    };
  }, [a, master]);

  const ocrFapData: FapSheetData = useMemo(() => {
    const ext = fapComparison?.extractedData || {};
    return {
      fapNumber: ext.fapNumber || a.fapNumber || '',
      applicationDate: ext.applicationDate || '',
      branchCode: ext.branchCode || '',
      customerStatus: ext.customerStatus || '',
      companyName: ext.companyName || '',
      companyType: ext.companyType || '',
      nib: ext.nib || '',
      nibDate: ext.nibDate || '',
      npwp: ext.npwp || '',
      establishmentActNo: ext.establishmentActNo || '',
      establishmentDate: ext.establishmentDate || '',
      latestDeedNo: ext.latestDeedNo || '',
      latestDeedDate: ext.latestDeedDate || '',
      companyAddress: ext.companyAddress || '',
      rt: ext.rt || '',
      rw: ext.rw || '',
      city: ext.city || '',
      province: ext.province || '',
      postalCode: ext.postalCode || '',
      phoneFax: ext.phoneFax || '',
      email: ext.email || '',
      website: ext.website || '',
      repaymentSource: ext.repaymentSource || '',
      locationStatus: ext.locationStatus || '',
      mainBusiness: ext.mainBusiness || '',
      experienceYears: ext.experienceYears != null ? ext.experienceYears : '',
      experienceMonths: ext.experienceMonths != null ? ext.experienceMonths : '',
      picName: ext.picName || '',
      position: ext.picPosition || '',
      phone: ext.picPhone || '',
      picEmail: ext.picEmail || '',
      currentAddress: ext.picAddress || ext.picCurrentAddress || '',
      picCity: ext.picCity || '',
      picProvince: ext.picProvince || '',
      picPostalCode: ext.picPostalCode || '',
      facilityPurpose: ext.facilityPurpose || '',
      financingMethod: ext.financingMethod || '',
      financingValue: ext.financingValue != null ? ext.financingValue : 0,
      downPaymentValue: ext.downPaymentValue != null ? ext.downPaymentValue : 0,
      interestRate: ext.interestRate != null ? ext.interestRate : 0,
      tenorMonths: ext.tenorMonths != null ? ext.tenorMonths : 0,
      paymentMethod: ext.paymentMethod || '',
      stakeholders: ext.stakeholders || [],
      projects: ext.projects || [],
      bankReferences: ext.bankReferences || [],
      financialStatements: ext.financialStatements || [],
      proposal: {
        facilityPurpose: ext.facilityPurpose || '',
        financingMethod: ext.financingMethod || '',
        financingValue: ext.financingValue != null ? ext.financingValue : 0,
        downPaymentValue: ext.downPaymentValue != null ? ext.downPaymentValue : 0,
        interestRate: ext.interestRate != null ? ext.interestRate : 0,
        tenorMonths: ext.tenorMonths != null ? ext.tenorMonths : 0,
        paymentMethod: ext.paymentMethod || ''
      }
    };
  }, [fapComparison, a.fapNumber]);

  async function previewFile(f: any) {
    try {
      if (f.demoData && f.demoData.startsWith('data:')) {
        setActiveFileUrl(f.demoData);
        setActiveFile(f);
        setZoom(1);
        setRotation(0);
        return;
      }
      const v = await api(`/files/${f.id}/url`);
      setActiveFileUrl(v.url);
      setActiveFile(f);
      setZoom(1);
      setRotation(0);
    } catch (e: any) {
      if (f.demoData) {
        setActiveFileUrl(f.demoData);
        setActiveFile(f);
        setZoom(1);
        setRotation(0);
      } else {
        setError(e.message || 'Failed to load document preview.');
      }
    }
  }

  async function handleFileUpload(item: any, file: File) {
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('checklistId', item.chk.id || item.code);
      body.append('documentCode', item.code);
      body.append('file', file);
      const res = await api(`/applications/${a.id}/documents/upload`, 'POST', body);
      const updated = await api(`/applications/${a.id}`);
      onChange(updated);
      notify(`Evidence ${item.title} uploaded successfully.`);
      if (res?.fapComparison?.isFap) {
        if (res.fapComparison.status === 'processing' || !res.fapComparison.extractedData) {
          setIsFapOcrScanning(true);
          setRightViewMode('ocr');
          notify(`Evidence ${item.title} uploaded successfully. Physical document OCR analysis is running in background...`);
          let attempts = 0;
          const pollTimer = setInterval(async () => {
            attempts++;
            try {
              const compRes = await api(`/applications/${a.id}/fap-comparison`);
              const c = compRes?.comparison;
              if (c && c.extractedData && Object.keys(c.extractedData).length > 0) {
                clearInterval(pollTimer);
                setIsFapOcrScanning(false);
                setFapComparison(c);
                setRightViewMode('ocr');
                if (c.hasDifferences) {
                  notify(`FAP Document OCR: ${c.diffs?.length || 0} data differences detected.`);
                } else {
                  notify('FAP Document OCR Verification: Data matches 100%, no differences detected.');
                }
              } else if (attempts >= 45) {
                clearInterval(pollTimer);
                setIsFapOcrScanning(false);
              }
            } catch {
              if (attempts >= 45) {
                clearInterval(pollTimer);
                setIsFapOcrScanning(false);
              }
            }
          }, 2000);
        } else {
          setFapComparison(res.fapComparison);
          setIsFapOcrScanning(false);
          setRightViewMode('ocr');
          if (res.fapComparison.hasDifferences) {
            notify(`FAP Document OCR Verification: ${res.fapComparison.diffs?.length || 0} data differences detected.`);
          } else {
            notify('FAP Document OCR Verification: Data matches the system, no differences detected.');
          }
        }
      } else {
        setIsFapOcrScanning(false);
      }
      const updatedChk = (updated.documentChecks || []).find((d: any) => 
        d.id === item.chk.id || 
        String(d.documentCode).toUpperCase() === item.code
      );
      if (updatedChk?.files?.length) {
        previewFile(updatedChk.files[updatedChk.files.length - 1]);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to upload evidence: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteFile(item: any, fileId: string) {
    if (!confirm('Delete this evidence file?')) return;
    setBusy(true);
    setError('');
    try {
      try {
        await api(`/applications/${a.id}/documents/${fileId}`, 'DELETE');
      } catch (err1: any) {
        await api(`/applications/${a.id}/documents/files/${fileId}`, 'DELETE');
      }
      const updated = await api(`/applications/${a.id}`);
      onChange(updated);

      const isFap = item.code === 'FAP' || 
                    String(item.documentCode || '').toUpperCase() === 'FAP' || 
                    String(item.chk?.documentCode || '').toUpperCase() === 'FAP' ||
                    String(item.name || '').toUpperCase().includes('FAP') ||
                    String(item.title || '').toUpperCase().includes('FAP');
      const updatedFap = (updated.documentChecks || []).find((d: any) => 
        String(d.documentCode).toUpperCase() === 'FAP' || String(d.documentName).toLowerCase().includes('fap')
      );
      const remainingFapFiles = updatedFap?.files?.length || 0;

      if (isFap) {
        if (remainingFapFiles === 0) {
          setFapComparison(null);
          setActiveFileUrl('');
          setActiveFile(null);
        } else {
          if (activeFile?.id === fileId) {
            const nextFile = updatedFap.files[updatedFap.files.length - 1];
            previewFile(nextFile);
          }
          try {
            const compRes = await api(`/applications/${a.id}/fap-comparison`);
            setFapComparison(compRes?.comparison || null);
          } catch {
            setFapComparison(null);
          }
        }
      } else {
        if (activeFile?.id === fileId) {
          setActiveFileUrl('');
          setActiveFile(null);
        }
      }
      notify('Evidence file deleted successfully.');
    } catch (e: any) {
      setError(e.message || 'Failed to delete evidence file.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveFapRemarks() {
    setRemarksSaveStatus('saving');
    try {
      await api(`/applications/${a.id}/fap-comparison/remarks`, 'POST', { remarks: fapRemarks });
      setRemarksSaveStatus('saved');
      notify('FAP verification remarks saved successfully.');
    } catch (err: any) {
      setRemarksSaveStatus('unsaved');
      setError('Failed to save verification remarks: ' + (err.message || ''));
    }
  }

  async function handleApproveFapChanges() {
    setBusy(true);
    setError('');
    try {
      const res = await api(`/applications/${a.id}/fap-changes/approve`, 'POST', {
        remarks: fapRemarks
      });
      localStorage.setItem(`crm_locked_customer_${a.id}`, 'true');
      const updated = res?.application || (await api(`/applications/${a.id}`));
      setFapComparison(null);
      notify('Physical FAP document approved. Customer & PIC details locked, proceeding to Pre-analysis.');
      if (onApproveDocument) {
        onApproveDocument(updated);
      } else {
        onChange({ ...updated, customerDetailLocked: true, stage: 'Pre-analysis' });
      }
    } catch (err: any) {
      setError('Failed to approve document: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDismissFapChanges() {
    setBusy(true);
    setError('');
    try {
      await api(`/applications/${a.id}/fap-changes/dismiss`, 'POST', {
        remarks: fapRemarks
      });
      setFapComparison(null);
      notify('Remarks saved. Staying on the current document.');
    } catch (err: any) {
      setError('Failed to dismiss data comparison: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRunFapComparison() {
    setBusy(true);
    setIsFapOcrScanning(true);
    setError('');
    try {
      const res = await api(`/applications/${a.id}/fap-comparison/run`, 'POST');
      if (res?.comparison) {
        setFapComparison(res.comparison);
        setRightViewMode('ocr');
        if (res.comparison.hasDifferences) {
          notify(`OCR scan complete: ${res.comparison.diffs?.length || 0} data differences found.`);
        } else {
          notify('OCR scan complete: Physical document data matches 100% with the system database.');
        }
      } else {
        notify('OCR scan complete.');
      }
    } catch (err: any) {
      setError('Failed to run OCR verification: ' + (err.message || ''));
    } finally {
      setBusy(false);
      setIsFapOcrScanning(false);
    }
  }

  return (
    <div className="evidence-studio-container">
      {/* Studio Header & Stage Pill Navigation */}
      <div className="evidence-studio-header">
        <div className="evidence-studio-title-area">
          <div className="evidence-studio-badge">
            <FolderCheck size={14} /> Studio Evidence
          </div>
          <h2>Evidence Files & Live Document Studio</h2>
          <p>
            Digital document management for financing application of debtor <strong>{a.customer?.companyName || 'Debtor'}</strong> ({a.fapNumber || 'FAP'}) · <strong>{totalFilesCount} Files Uploaded</strong>
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
                <span className={`evidence-pill-count ${count > 0 ? 'has-files' : ''}`}>
                  {count}
                </span>
                {isDone && <CheckCircle size={13} className="evidence-pill-done-icon" />}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="error" role="alert" style={{ marginBottom: '14px' }}>{error}</div>}

      {/* When FAP is selected: Full-Width Top Uploader + 50/50 Split Preview + Bottom Diff Panel */}
      {selectedCode === 'FAP' ? (
        <div className="fap-studio-fap-view">
          {/* Top Section: Full-Width Upload Banner with History Pop-up Button */}
          <div className="fap-evidence-full-top">
            <div className="fap-evidence-top-header">
              <div className="fap-evidence-top-title-area">
                <div className="fap-evidence-top-icon">
                  <UploadCloud size={20} />
                </div>
                <div className="fap-evidence-top-text">
                  <h3>Upload Signed FAP Form Evidence (Customer Signed)</h3>
                  <p>Upload a scanned file or PDF of the physically signed FAP form for automatic OCR verification.</p>
                </div>
              </div>
              <div className="fap-evidence-top-actions">
                <button
                  type="button"
                  className="fap-history-popup-btn"
                  onClick={() => setShowHistoryModal(true)}
                  title="Open the list of uploaded FAP document history"
                >
                  <Files size={15} color="#002060" />
                  <span>Upload History ({activeFiles.length})</span>
                </button>
                <Badge status={activeItem.chk.status || (activeFiles.length ? 'UPLOADED' : 'PENDING')} />
              </div>
            </div>

            {/* Full-width Dropzone or Locked Banner */}
            {isFapLocked ? (
              <div className="stage-readonly-banner" style={{margin:'0 0 16px 0', background:'#ecfdf5', borderColor:'#a7f3d0', color:'#065f46', borderRadius:'8px'}}>
                <Lock size={18} />
                <span><strong>FAP Document Locked:</strong> Application is now in <strong>Pre-analysis</strong> stage. Physical FAP document has been verified and approved. FAP document file is permanently locked (cannot be re-uploaded or deleted).</span>
              </div>
            ) : canUpload && (
              <label className="fap-dropzone-full" onClick={e => e.stopPropagation()}>
                <div className="fap-dropzone-full-icon">
                  {busy ? <Loader2 size={22} className="spin" /> : <UploadCloud size={22} />}
                </div>
                <strong>{busy ? 'Uploading and processing OCR...' : 'Drag & drop FAP PDF/Image file here, or click to select a file'}</strong>
                <span>Files are automatically named with application hash and date stamp</span>
                <span className="fap-dropzone-full-hint">
                  Supported formats: PDF, PNG, JPEG · Max 20 MB · Automatic system data vs OCR comparison
                </span>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  disabled={busy}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(activeItem, f);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>

          {/* Unified Section Navigation Bar */}
          <div className="fap-unified-section-nav">
            <div className="fap-nav-left">
              <span className="fap-nav-label">
                <Files size={14} color="#002060" /> Form Navigation:
              </span>
              <button 
                type="button" 
                className={fapNavFilter === 'all' ? 'active' : ''} 
                onClick={() => scrollToFapSection('all')}
              >
                All Sections
              </button>
              <button 
                type="button" 
                className={fapNavFilter === 'fap-preview-sec-header' ? 'active' : ''} 
                onClick={() => scrollToFapSection('fap-preview-sec-header')}
              >
                1. Identity
              </button>
              <button 
                type="button" 
                className={fapNavFilter === 'fap-preview-sec-company' ? 'active' : ''} 
                onClick={() => scrollToFapSection('fap-preview-sec-company')}
              >
                2. Domicile
              </button>
              <button 
                type="button" 
                className={fapNavFilter === 'fap-preview-sec-business' ? 'active' : ''} 
                onClick={() => scrollToFapSection('fap-preview-sec-business')}
              >
                3. Profile
              </button>
              <button 
                type="button" 
                className={fapNavFilter === 'fap-preview-sec-pic' ? 'active' : ''} 
                onClick={() => scrollToFapSection('fap-preview-sec-pic')}
              >
                4. PIC
              </button>
              <button 
                type="button" 
                className={fapNavFilter === 'fap-preview-sec-projects' ? 'active' : ''} 
                onClick={() => scrollToFapSection('fap-preview-sec-projects')}
              >
                5. Projects
              </button>
            </div>
          </div>

          {/* 50 / 50 Comparison Split Grid */}
          <div className="fap-comparison-grid-5050" ref={fapComparisonContainerRef}>
            {/* Left Pane (50%): Dokumen Terakhir yang di-generate oleh sistem */}
            <div className="fap-pane-card">
              <div className="fap-pane-head">
                <div className="fap-pane-head-top">
                  <div className="fap-pane-head-info">
                    <h4>
                      <FileSpreadsheet size={16} color="#002060" />
                      System FAP Document (Last Generated)
                    </h4>
                    <span className="fap-pane-head-sub">
                      Current live database data · FAP No: {a.fapNumber || '-'}
                    </span>
                  </div>
                  <div className="fap-pane-head-actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() => printFapDocument(a.fapNumber)}
                      title="Print system FAP form"
                      style={{display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'11.5px', height:'26px', padding:'2px 10px'}}
                    >
                      <Printer size={13} /> Print Form
                    </button>
                  </div>
                </div>
                <div className="fap-pane-head-bottom">
                  <div style={{display:'flex', alignItems:'center', gap:'6px', marginLeft:'auto'}}>
                    <span style={{fontSize:'11.5px', color:'#334155', fontWeight:600}}>Zoom:</span>
                    <div className="excel-zoom-controls compact">
                      <button
                        type="button"
                        onClick={() => setSystemZoom(z => Math.max(0.05, Number((z - 0.05).toFixed(2))))}
                        className="excel-zoom-btn btn-zoom-icon"
                        title="Zoom Out (-)"
                      >
                        <ZoomOut size={13} />
                      </button>
                      <span className="excel-zoom-val">{Math.round(systemZoom * 100)}%</span>
                      <button
                        type="button"
                        onClick={() => setSystemZoom(z => Math.min(1.5, Number((z + 0.05).toFixed(2))))}
                        className="excel-zoom-btn btn-zoom-icon"
                        title="Zoom In (+)"
                      >
                        <ZoomIn size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={handleFitBothDocuments}
                        className="excel-zoom-btn btn-fit excel-zoom-fit-btn"
                        title="Fit both documents to screen size"
                      >
                        Fit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="fap-pane-body fap-pane-body-system">
                <FapSheetPreview
                  data={liveFapData}
                  isComparison={true}
                  hideToolbar={true}
                  diffSide="system"
                  diffs={activeFiles.length > 0 && fapComparison ? fapComparison.diffs || [] : []}
                  externalZoom={systemZoom}
                  activeSection={fapNavFilter === 'all' ? undefined : fapNavFilter}
                  syncTick={fapNavTick}
                  onPrint={() => printFapDocument(a.fapNumber)}
                />
              </div>
            </div>

            {/* Right Pane (50%): Dokumen Hasil OCR (Fisik Terunggah) */}
            <div className="fap-pane-card">
              <div className="fap-pane-head">
                <div className="fap-pane-head-top">
                  <div className="fap-pane-head-info">
                    <h4>
                      <FileSpreadsheet size={16} color="#002060" />
                      OCR Physical Signed FAP
                    </h4>
                    <span className="fap-pane-head-sub" title={activeFile ? activeFile.fileName : ''}>
                      {activeFile ? activeFile.fileName : 'No physical document uploaded yet'}
                    </span>
                  </div>
                  <div className="fap-pane-head-actions">
                    {activeFile && (
                      <>
                        <span className="studio-file-tag" style={{padding:'2px 8px', fontSize:'11px', background:'#e2e8f0', borderRadius:'4px', fontWeight:600, height:'24px', display:'inline-flex', alignItems:'center'}}>
                          {activeFile.mimeType === 'application/pdf' ? 'PDF' : 'IMG'}
                        </span>
                        {activeFileUrl && (
                          <a
                            href={activeFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="button small"
                            style={{display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'11.5px', height:'26px', padding:'2px 10px', textDecoration:'none'}}
                            title="Open document in new tab"
                          >
                            <ExternalLink size={12} /> Open Tab
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="fap-pane-head-bottom">
                  {activeFile && (
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <button
                        type="button"
                        className="button small"
                        disabled={busy}
                        onClick={handleRunFapComparison}
                        style={{display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'11px', height:'26px', padding:'2px 10px'}}
                        title="Re-scan the physical document and compare with the latest system data"
                      >
                        {busy ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
                        Re-scan OCR
                      </button>
                      <div style={{display:'inline-flex', background:'#f1f5f9', padding:'2px', borderRadius:'6px', border:'1px solid #cbd5e1'}}>
                        <button
                          type="button"
                          className={`button small ${rightViewMode === 'ocr' ? 'primary' : ''}`}
                          onClick={() => setRightViewMode('ocr')}
                          style={{fontSize:'11px', padding:'2px 10px', height:'22px', borderRadius:'4px'}}
                          title="Show OCR-extracted FAP form with difference highlights"
                        >
                          <FileSpreadsheet size={12} style={{marginRight:4}} /> OCR Form
                        </button>
                        <button
                          type="button"
                          className={`button small ${rightViewMode === 'pdf' ? 'primary' : ''}`}
                          onClick={() => setRightViewMode('pdf')}
                          style={{fontSize:'11px', padding:'2px 10px', height:'22px', borderRadius:'4px'}}
                          title="Show original physical PDF file"
                        >
                          <Eye size={12} style={{marginRight:4}} /> Original File
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="fap-pane-body fap-pane-body-physical" style={{ position: 'relative' }}>
                {isFapOcrScanning && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(255, 255, 255, 0.94)',
                    backdropFilter: 'blur(3px)',
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '24px',
                    textAlign: 'center'
                  }}>
                    <Loader2 size={38} className="spin" style={{ color: '#002060' }} />
                    <div style={{ fontWeight: 600, color: '#002060', fontSize: '15px' }}>
                      Mengekstrak Dokumen FAP dengan OCR...
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px', maxWidth: '380px', lineHeight: 1.5 }}>
                      Sistem sedang membaca setiap kolom teks dari dokumen PDF yang diupload. Hasil pembacaan akan otomatis langsung tampil di formulir ini begitu selesai.
                    </p>
                  </div>
                )}
                {activeFiles.length > 0 && activeFileUrl ? (
                  rightViewMode === 'ocr' ? (
                    <FapSheetPreview
                      data={ocrFapData}
                      isComparison={true}
                      hideToolbar={true}
                      diffSide="ocr"
                      diffs={activeFiles.length > 0 && fapComparison ? fapComparison.diffs || [] : []}
                      externalZoom={systemZoom}
                      activeSection={fapNavFilter === 'all' ? undefined : fapNavFilter}
                      syncTick={fapNavTick}
                      onPrint={() => printFapDocument(a.fapNumber)}
                    />
                  ) : activeFile?.mimeType === 'application/pdf' ? (
                    <iframe
                      src={pdfViewerSrc}
                      title="Dokumen Fisik Signed FAP"
                      style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff', flex: 1 }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '16px', flex: 1 }}>
                      <img
                        src={activeFileUrl}
                        alt="Dokumen Fisik Signed FAP"
                        style={{ maxWidth: `${zoom * 100}%`, transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s', objectFit: 'contain' }}
                      />
                    </div>
                  )
                ) : (
                  <div className="fap-physical-empty">
                    <FileText size={48} strokeWidth={1.5} />
                    <h5>No Physical File Uploaded Yet</h5>
                    <p>Please upload the physically signed FAP form document in the upload area above to see the side-by-side comparison.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section: Differences Comparison Panel - only rendered when comparator file and comparison exist */}
          {activeFiles.length > 0 && fapComparison && (
            <div className="fap-diff-panel">
              <div className="fap-diff-panel-head">
                <div>
                  <h3>
                    <Sparkles size={18} color="#2563eb" />
                    Data Difference Analysis (System vs Physical Document OCR)
                  </h3>
                  <p>Automatic comparison results between system database values and data read from the physically signed FAP document.</p>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <button
                    type="button"
                    className="button small"
                    disabled={busy}
                    onClick={handleRunFapComparison}
                    style={{display:'inline-flex', alignItems:'center', gap:'6px'}}
                    title="Re-scan the physical document and compare with the latest system data"
                  >
                    {busy ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
                    Re-analyze OCR
                  </button>
                </div>
              </div>

              {/* Notice Alert Banner */}
              {fapComparison.hasDifferences ? (
                <div className="fap-diff-banner warning">
                  <AlertTriangle size={18} style={{flexShrink:0, marginTop:1}} />
                  <div>
                    <strong>Non-Blocking Notice:</strong> <strong>{fapComparison.diffs?.length || 0} data differences</strong> detected between the signed physical document and the system database. The submit button is now unlocked. You may approve the data changes to update the system automatically, or keep the existing system data.
                  </div>
                </div>
              ) : (
                <div className="fap-diff-banner success">
                  <CheckCircle size={18} style={{flexShrink:0, marginTop:1}} />
                  <div>
                    <strong>Perfect Verification:</strong> All data on the physical document read by OCR matches 100% with the system database. No inconsistencies found.
                  </div>
                </div>
              )}

              {/* Differences Table */}
              {fapComparison.diffs && (
                <>
                  {fapNavFilter !== 'all' && (
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'6px', marginBottom:'12px', fontSize:'12px', color:'#1e40af'}}>
                      <span>Showing differences for: <strong>{fapSectionTitles[fapNavFilter] || fapNavFilter}</strong> ({filteredDiffs.length} differences)</span>
                      <button type="button" className="button small" onClick={() => setFapNavFilter('all')} style={{fontSize:'11px', padding:'2px 10px', height:'24px', background:'#ffffff'}}>
                        Show All Differences ({fapComparison.diffs.length})
                      </button>
                    </div>
                  )}
                  <div className="fap-diff-table-wrap">
                    <table className="fap-diff-table">
                      <thead>
                        <tr>
                          <th style={{width:'24%'}}>Field Name</th>
                          <th style={{width:'30%'}}>Current System Data</th>
                          <th style={{width:'30%'}}>OCR Detected Data (Physical Document)</th>
                          <th style={{width:'16%', textAlign:'center'}}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDiffs.map((d: any, idx: number) => (
                          <tr key={d.field || idx} className="is-different">
                            <td>
                              <strong>{d.label}</strong>
                              <div style={{fontSize:'11px', color:'#94a3b8', fontFamily:'monospace'}}>{d.field}</div>
                            </td>
                            <td>
                              <span style={{background:'#f1f5f9', padding:'3px 8px', borderRadius:'4px', border:'1px solid #e2e8f0', display:'inline-block'}}>
                                {d.oldValue || '—'}
                              </span>
                            </td>
                            <td>
                              <span style={{background:'#fef3c7', color:'#92400e', fontWeight:600, padding:'3px 8px', borderRadius:'4px', border:'1px solid #fde68a', display:'inline-block'}}>
                                {d.newValue}
                              </span>
                            </td>
                            <td style={{textAlign:'center'}}>
                              <span className="fap-diff-badge different">
                                <AlertTriangle size={11} /> Different
                              </span>
                            </td>
                          </tr>
                        ))}
                        {filteredDiffs.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{textAlign:'center', padding:'24px', color:'#059669'}}>
                              <CheckCircle size={20} style={{verticalAlign:'middle', marginRight:'8px'}} />
                              {fapNavFilter === 'all' 
                                ? 'All tested data fields match the system data!' 
                                : `No differences found in ${fapSectionTitles[fapNavFilter] || 'this section'}.`}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* FAP Verification Remarks Rich Text Editor */}
                  <div className="fap-diff-remarks-card">
                    <div className="fap-diff-remarks-head">
                      <div className="fap-diff-remarks-title">
                        <div className="fap-diff-remarks-title-icon">
                          <FileText size={16} />
                        </div>
                        <div className="fap-diff-remarks-title-text">
                          <h4>FAP Document Verification Notes & Remarks</h4>
                          <p>
                            Use this section to add verification notes (e.g. clarifying OCR discrepancies, documenting approved changes or addendums, or other verification justifications).
                          </p>
                        </div>
                      </div>
                      <div className="fap-diff-remarks-actions">
                        {remarksSaveStatus === 'saved' && (
                          <span style={{ fontSize: '11.5px', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                            <CheckCircle size={13} /> Saved
                          </span>
                        )}
                        {remarksSaveStatus === 'saving' && (
                          <span style={{ fontSize: '11.5px', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Loader2 size={13} className="spin" /> Saving...
                          </span>
                        )}
                        <button
                          type="button"
                          className="button small"
                          disabled={busy || remarksSaveStatus === 'saving'}
                          onClick={handleSaveFapRemarks}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '4px 12px', height: '28px' }}
                          title="Save verification remarks"
                        >
                          <Save size={13} /> Save Remarks
                        </button>
                      </div>
                    </div>

                    <FapRemarksTinyMCE
                      key={`${a.id}-${fapComparison?.fileName || 'fap'}`}
                      initialContent={fapRemarks}
                      disabled={busy}
                      onChange={(content) => {
                        setFapRemarks(content);
                        setRemarksSaveStatus('unsaved');
                      }}
                    />
                  </div>

                  {/* Bottom Actions Bar */}
                  {fapComparison && (
                    isFapLocked ? (
                      <div className="fap-diff-actions-bar" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', background:'#ecfdf5', padding:'12px 18px', border:'1px solid #a7f3d0', borderRadius:'8px', marginTop:'14px', flexWrap:'wrap'}}>
                        <span style={{fontSize:'12.5px', color:'#065f46', lineHeight:1.4, flex:1, minWidth:'280px', display:'inline-flex', alignItems:'center', gap:'8px'}}>
                          <Lock size={16} /> Physical FAP document has been approved &amp; verified. All FAP Stage data is permanently locked in Pre-analysis.
                        </span>
                        <div className="fap-diff-actions-right" style={{display:'flex', alignItems:'center', gap:'10px', flexShrink:0}}>
                          <span style={{display:'inline-flex', alignItems:'center', gap:'6px', color:'#059669', fontWeight:600, fontSize:'13px', background:'#ffffff', padding:'6px 14px', borderRadius:'6px', border:'1px solid #a7f3d0'}}>
                            <CheckCircle size={15}/> Document Approved (Locked)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                      <div className="fap-diff-actions-bar" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', background:'#f8fafc', padding:'12px 18px', border:'1px solid #e2e8f0', borderRadius:'8px', marginTop:'14px', flexWrap:'wrap'}}>
                        <span style={{fontSize:'12.5px', color:'#475569', lineHeight:1.4, flex:1, minWidth:'280px'}}>
                          Physical FAP document discrepancies are recorded in the Remarks section above. Approving this document will <strong>NOT alter system/database records</strong>, and will <strong>lock Customer &amp; PIC details</strong> before proceeding to Pre-analysis.
                        </span>
                        <div className="fap-diff-actions-right" style={{display:'flex', alignItems:'center', gap:'10px', flexShrink:0}}>
                          <button
                            type="button"
                            className="button"
                            disabled={busy}
                            onClick={handleDismissFapChanges}
                            style={{display:'inline-flex', alignItems:'center', gap:'6px'}}
                            title="Save remarks notes and stay on the current document"
                          >
                            <Pencil size={14} /> Review Remarks / Stay on Document
                          </button>
                          <button
                            type="button"
                            className="button primary"
                            disabled={busy}
                            onClick={() => setConfirmApproveFapOpen(true)}
                            style={{display:'inline-flex', alignItems:'center', gap:'6px', background:'#059669', borderColor:'#059669'}}
                            title="Approve document verification and lock Customer & PIC details"
                          >
                            {busy ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />}
                            Approve Document (Lock Customer &amp; PIC)
                          </button>
                        </div>
                      </div>
                      {confirmApproveFapOpen && (
                        <Modal title="Confirm Document Approval" onClose={() => setConfirmApproveFapOpen(false)}>
                          <div className="modal-body" style={{ minWidth: '320px', maxWidth: '480px', padding: '24px 28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                              <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                background: '#ecfdf5',
                                color: '#059669',
                                border: '1px solid #a7f3d0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <CheckCircle size={22} />
                              </div>
                              <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Are you sure?</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>{a.customer?.companyName || 'Company'} · {a.fapNumber}</p>
                              </div>
                            </div>
                            <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.6, margin: '0 0 12px' }}>
                              Are you sure you want to approve this physical FAP document?
                            </p>
                            <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.5, margin: 0, background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              Customer &amp; PIC sections will be locked, and you will proceed directly to the <strong>Pre-analysis</strong> stage.
                            </p>
                          </div>
                          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                            <button
                              type="button"
                              className="button"
                              onClick={() => setConfirmApproveFapOpen(false)}
                              disabled={busy}
                              style={{ minWidth: '80px', fontWeight: 600 }}
                            >
                              No
                            </button>
                            <button
                              type="button"
                              className="button primary"
                              disabled={busy}
                              onClick={async () => {
                                setConfirmApproveFapOpen(false);
                                await handleApproveFapChanges();
                              }}
                              style={{ minWidth: '90px', background: '#059669', borderColor: '#059669', fontWeight: 600 }}
                            >
                              {busy ? <Loader2 size={15} className="spin" /> : <CheckCircle size={15} />}
                              Yes
                            </button>
                          </div>
                        </Modal>
                      )}
                      </>
                    )
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Non-FAP Stages: Standard Studio Layout */
        <div className={`evidence-studio-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {/* Left Column: Stage Inspector & File Deck */}
          <div className="evidence-studio-sidebar">
            <div className="evidence-stage-card">
              <div className="evidence-stage-card-header">
                <div>
                  <span className={`evidence-stage-badge ${activeItem.badgeClass}`}>
                    {activeItem.stage} · {activeItem.role}
                  </span>
                  <h3 className="evidence-stage-title">{activeItem.title}</h3>
                  <p className="evidence-stage-desc">{activeItem.desc}</p>
                </div>
                <Badge status={activeItem.chk.status || (activeFiles.length ? 'UPLOADED' : 'PENDING')} />
              </div>

              {/* Upload Dropzone */}
              {canUpload && (
                <label className="evidence-dropzone-studio" onClick={e => e.stopPropagation()}>
                  <div className="evidence-dropzone-icon-wrap">
                    <Upload size={20} />
                  </div>
                  <div className="evidence-dropzone-text">
                    <strong>{busy ? 'Uploading file...' : `Upload Evidence ${activeItem.name}`}</strong>
                    <span>Drag file here or click to select</span>
                  </div>
                  <span className="evidence-dropzone-hint">
                    PDF, PNG, JPEG · Max. 20 MB
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    disabled={busy}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(activeItem, f);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}

              {/* Stage Files Deck */}
              <div className="evidence-files-section">
                <div className="evidence-files-header">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <h4>Uploaded Files ({activeFiles.length})</h4>
                    <span className="evidence-files-summary">
                      {activeFiles.length > 0 ? 'Select to preview' : 'No files yet'}
                    </span>
                  </div>
                </div>

                {activeFiles.length === 0 ? (
                  <div className="evidence-files-empty">
                    <FileText size={28} className="evidence-empty-icon" />
                    <p>No files for the {activeItem.stage} stage</p>
                    <small>Please upload supporting documents via the upload area above.</small>
                  </div>
                ) : (
                  <div className="evidence-files-list">
                    {activeFiles.map((f: any) => {
                      const isPreviewed = activeFile?.id === f.id;
                      const isPdf = f.mimeType === 'application/pdf' || f.fileName?.toLowerCase().endsWith('.pdf');
                      const sizeNum = Number(f.fileSize || 0);
                      const sizeStr = sizeNum > 1024 * 1024
                        ? `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.max(1, Math.round(sizeNum / 1024))} KB`;
                      const dateStr = f.createdAt ? new Date(f.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) : '';

                      return (
                        <div
                          key={f.id}
                          className={`evidence-deck-card ${isPreviewed ? 'active' : ''}`}
                          onClick={() => previewFile(f)}
                          title="Click to open document preview"
                        >
                          <div className={`evidence-file-icon-box ${isPdf ? 'pdf' : 'img'}`}>
                            <FileText size={16} />
                            <span className="evidence-file-format-tag">{isPdf ? 'PDF' : 'IMG'}</span>
                          </div>
                          <div className="evidence-deck-card-info">
                            <div className="evidence-deck-filename" title={f.fileName}>
                              {f.fileName}
                            </div>
                            <div className="evidence-deck-meta">
                              <span>{sizeStr}</span>
                              {dateStr && (
                                <>
                                  <span>•</span>
                                  <span>{dateStr}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="evidence-deck-actions" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              className={`evidence-action-btn ${isPreviewed ? 'active' : ''}`}
                              onClick={() => previewFile(f)}
                              title="Preview document"
                            >
                              <Eye size={13} />
                            </button>
                            {canUpload && (
                              <button
                                type="button"
                                className="evidence-action-btn danger"
                                onClick={() => handleDeleteFile(activeItem, f.id)}
                                title="Delete this file"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Studio Document Previewer */}
          <section className={`panel document-viewer-studio ${isMaximized ? 'maximized' : ''}`}>
            {/* Studio Top Context Bar */}
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

            {/* Translucent Glass Toolbar */}
            <div className="studio-glass-toolbar">
              <div className="studio-toolbar-left">
                <button
                  type="button"
                  className="studio-toolbar-toggle-btn"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  title={sidebarCollapsed ? "Show file list (Split View)" : "Expand Preview (Full Canvas)"}
                >
                  <Columns size={14} />
                  <span>{sidebarCollapsed ? "Split View" : "Full Canvas"}</span>
                </button>
                {activeFile && (
                  <span className="studio-file-chip">
                    <span className="studio-file-tag">{activeFile.mimeType === 'application/pdf' ? 'PDF' : 'IMG'}</span>
                    <span className="studio-file-name">{activeFile.fileName}</span>
                    {activeFile.fileSize && (
                      <span className="studio-file-size">({(activeFile.fileSize / 1024).toFixed(0)} KB)</span>
                    )}
                  </span>
                )}
              </div>

              <div className="studio-toolbar-center">
                {activeFile?.mimeType === 'application/pdf' && (
                  <div className="studio-pdf-zoom-group">
                    <button
                      type="button"
                      className={`evidence-zoom-pill ${pdfZoom === 'FitH' ? 'active' : ''}`}
                      onClick={() => setPdfZoom('FitH')}
                      title="Pas Lebar (Fit Width)"
                    >
                      Fit Width
                    </button>
                    <button
                      type="button"
                      className={`evidence-zoom-pill ${pdfZoom === '100' ? 'active' : ''}`}
                      onClick={() => setPdfZoom('100')}
                      title="Skala 100%"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      className={`evidence-zoom-pill ${pdfZoom === '125' ? 'active' : ''}`}
                      onClick={() => setPdfZoom('125')}
                      title="Skala 125%"
                    >
                      125%
                    </button>
                    <button
                      type="button"
                      className={`evidence-zoom-pill ${pdfZoom === 'Fit' ? 'active' : ''}`}
                      onClick={() => setPdfZoom('Fit')}
                      title="Pas Halaman (Fit Page)"
                    >
                      Fit Page
                    </button>
                  </div>
                )}

                {activeFile?.mimeType?.startsWith('image/') && (
                  <div className="studio-image-controls">
                    <button
                      type="button"
                      className="studio-tool-btn"
                      onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                      title="Zoom Out"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="studio-zoom-val">{Math.round(zoom * 100)}%</span>
                    <button
                      type="button"
                      className="studio-tool-btn"
                      onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                      title="Zoom In"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      type="button"
                      className="studio-tool-btn"
                      onClick={() => setRotation(rotation + 90)}
                      title="Rotate 90 Degrees"
                    >
                      <RotateCw size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="studio-toolbar-right">
                {activeFileUrl && (
                  <>
                    <a
                      href={activeFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="studio-tool-btn"
                      title="Open document in new tab"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <a
                      href={`/api/v1/files/${activeFile?.id}/download`}
                      download={activeFile?.fileName || 'document'}
                      className="studio-tool-btn"
                      title="Download document"
                    >
                      <Download size={14} />
                    </a>
                  </>
                )}
                <button
                  type="button"
                  className="studio-tool-btn"
                  onClick={() => setIsMaximized(!isMaximized)}
                  title={isMaximized ? "Minimize canvas" : "Maximize canvas"}
                >
                  {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>
            </div>

            {/* Viewport Canvas */}
            <div className="studio-viewport-canvas">
              {activeFileUrl ? (
                activeFile?.mimeType === 'application/pdf' ? (
                  <iframe
                    key={`${activeFile.id}-${pdfZoom}`}
                    title={activeFile.fileName}
                    src={pdfViewerSrc}
                    className="studio-pdf-iframe"
                  />
                ) : (
                  <div className="studio-image-wrapper">
                    <img
                      alt={activeFile?.fileName}
                      src={activeFileUrl}
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        transition: 'transform 0.15s ease'
                      }}
                    />
                  </div>
                )
              ) : (
                <div className="studio-empty-canvas">
                  <div className="studio-empty-icon-wrap">
                    <FileText size={44} />
                  </div>
                  <h3>Select a Document for Live Preview</h3>
                  <p>
                    Select a file from the list on the left to view the full preview in this studio canvas.
                  </p>
                  <div className="studio-empty-features">
                    <span>✓ High-resolution PDF & Image preview</span>
                    <span>✓ Zoom Fit Width & Fit Page scale controls</span>
                    <span>✓ Fullscreen mode for committee evaluation</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Pop-up Modal: Upload History */}
      {showHistoryModal && (
        <Modal title={`Upload History · ${activeItem.title}`} onClose={() => setShowHistoryModal(false)}>
          <div className="modal-body" style={{maxHeight:'70vh', overflowY:'auto'}}>
            <p className="muted" style={{marginBottom:'14px'}}>
              Debtor: <strong>{a.customer?.companyName || 'Debtor'}</strong> · FAP No: <strong>{a.fapNumber || '-'}</strong> · Total <strong>{activeFiles.length} files</strong>
            </p>
            {activeFiles.length === 0 ? (
              <div style={{textAlign:'center', padding:'32px 16px', color:'#94a3b8'}}>
                <FileText size={36} style={{margin:'0 auto 10px auto', display:'block'}} />
                <p>No files uploaded for this stage yet.</p>
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                {activeFiles.map((f: any) => {
                  const isPreviewed = activeFile?.id === f.id;
                  const isPdf = f.mimeType === 'application/pdf' || f.fileName?.toLowerCase().endsWith('.pdf');
                  const sizeNum = Number(f.fileSize || 0);
                  const sizeStr = sizeNum > 1024 * 1024
                    ? `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`
                    : `${Math.max(1, Math.round(sizeNum / 1024))} KB`;
                  const dateStr = f.createdAt ? new Date(f.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : '';

                  return (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        border: isPreviewed ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                        background: isPreviewed ? '#eff6ff' : '#ffffff',
                        borderRadius: '8px',
                        gap: '12px'
                      }}
                    >
                      <div style={{display:'flex', alignItems:'center', gap:'12px', minWidth:0, flex:1}}>
                        <div className={`evidence-file-icon-box ${isPdf ? 'pdf' : 'img'}`} style={{flexShrink:0}}>
                          <FileText size={18} />
                          <span className="evidence-file-format-tag">{isPdf ? 'PDF' : 'IMG'}</span>
                        </div>
                        <div style={{minWidth:0, flex:1}}>
                          <div style={{fontWeight:600, fontSize:'13px', color:'#0f172a', wordBreak:'break-all'}} title={f.fileName}>
                            {f.fileName}
                          </div>
                          <div style={{fontSize:'11.5px', color:'#64748b', marginTop:'2px', display:'flex', gap:'8px', flexWrap:'wrap'}}>
                            <span>{sizeStr}</span>
                            {dateStr && <span>• {dateStr}</span>}
                            {f.uploadedBy && <span>• Uploaded by: {f.uploadedBy}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{display:'flex', alignItems:'center', gap:'6px', flexShrink:0}}>
                        <button
                          type="button"
                          className={`button small ${isPreviewed ? 'primary' : ''}`}
                          onClick={() => {
                            previewFile(f);
                            setShowHistoryModal(false);
                          }}
                          title="Show in preview screen"
                        >
                          <Eye size={13} /> {isPreviewed ? 'Active' : 'Preview'}
                        </button>
                        <a
                          href={`/api/v1/files/${f.id}/download`}
                          download={f.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="button small"
                          title="Download file"
                          style={{display:'inline-flex', alignItems:'center'}}
                        >
                          <Download size={13} />
                        </a>
                        {canUpload && !(isFapLocked && activeItem.code === 'FAP') && (
                          <button
                            type="button"
                            className="button small"
                            onClick={() => handleDeleteFile(activeItem, f.id)}
                            title="Delete file"
                            style={{color:'#dc2626', borderColor:'#fecaca', background:'#fef2f2'}}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setShowHistoryModal(false)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
