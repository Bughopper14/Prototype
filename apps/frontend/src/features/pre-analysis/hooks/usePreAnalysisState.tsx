/** All state, derived values and handlers of PreAnalysisForm; shared with its sections through PreAnalysisContext. */
import {DEFAULT_GROUP_STRUCTURE, defaultInitialData} from '@/features/pre-analysis/lib/defaults';
import {computePreAnalysisDiffs} from '@/features/pre-analysis/lib/diff';
import {formatGroupStructureAsNarrative} from '@/features/pre-analysis/lib/group-structure';
import {syncCustomerAndPicIntoPreAnalysis} from '@/features/pre-analysis/lib/sync-customer';
import {GroupStructureData, PreAnalysisData} from '@/features/pre-analysis/lib/types';
import {api} from '@/shared/lib/api';
import {isFieldMandatory, useMandatoryRules} from '@/shared/master-data';
import {useEffect, useMemo, useRef, useState} from 'react';

export interface PreAnalysisFormProps {
  applicationId: string;
  application?: any;
  customer?: any;
  pic?: any;
  profile?: any;
  onSaved?: (diffs?: any[]) => void;
  notify?: (msg: string) => void;
  registerSave?: (saveFn: () => Promise<void>) => void;
  onSavingChange?: (saving: boolean) => void;
}

import {useGroupStructure} from '@/features/pre-analysis/hooks/useGroupStructure';
import {usePreAnalysisPrint} from '@/features/pre-analysis/hooks/usePreAnalysisPrint';
export function usePreAnalysisState(props: PreAnalysisFormProps) {
  const mandatoryRules = useMandatoryRules();
  const reqMark = (fieldKey: string, section: string = 'General Information') => {
    const isReq = isFieldMandatory(mandatoryRules, section, fieldKey, false, 'PRE-AN');
    return isReq ? (
      <span
        className="field-required"
        aria-label="Required"
        style={{
          color: '#ef4444',
          fontWeight: 700,
          marginLeft: '4px',
          display: 'inline',
          lineHeight: 1,
          verticalAlign: 'baseline',
        }}
      >
        *
      </span>
    ) : null;
  };
  const initialDataRef = useRef<any>(null);
  const [data, setData] = useState<PreAnalysisData>(() => {
    return syncCustomerAndPicIntoPreAnalysis(defaultInitialData, props);
  });

  const isRecommended = data.recommendation
    ? !data.recommendation.toUpperCase().includes('NOT') &&
      data.recommendation.toUpperCase().includes('RECOMMEND')
    : false;

  const [viewMode, setViewMode] = useState<'digital-twin' | 'original-pdf'>('digital-twin');
  const [zoomLevel, setZoomLevel] = useState<number>(0.75);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Accordion section toggles - All 7 sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sec1: true,
    sec2: true,
    sec3: true,
    sec4: true,
    sec5: true,
    sec6: true,
    sec7: true,
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const nextOpen = !prev[id];
      if (nextOpen) {
        const secMap: Record<string, string> = {
          sec1: 'preana-preview-sec-1',
          sec2: 'preana-preview-sec-2',
          sec3: 'preana-preview-sec-3',
          sec4: 'preana-preview-sec-4',
          sec5: 'preana-preview-sec-5',
          sec6: 'preana-preview-sec-6',
          sec7: 'preana-preview-sec-7',
        };
        if (secMap[id]) {
          scrollToPreviewElement(secMap[id]);
        }
      }
      return {...prev, [id]: nextOpen};
    });
  };

  // Sync scroll & highlight helper
  const scrollToPreviewElement = (elementId: string) => {
    if (viewMode === 'original-pdf') {
      setViewMode('digital-twin');
    }
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({behavior: 'smooth', block: 'center'});
        el.classList.remove('fap-preview-sync-highlight');
        void el.offsetWidth;
        el.classList.add('fap-preview-sync-highlight');
        setTimeout(() => {
          el.classList.remove('fap-preview-sync-highlight');
        }, 2500);
      }
    }, 50);
  };

  const handleTriggerSync = (secId: string, previewSecId: string) => {
    setOpenSections(prev => ({...prev, [secId]: true}));
    scrollToPreviewElement(previewSecId);
  };

  const handlePreviewCellClick = (fieldKey: string, sectionId?: string) => {
    if (sectionId) {
      setOpenSections(prev => ({...prev, [sectionId]: true}));
      const formTarget = document.getElementById('acc-' + sectionId);
      if (formTarget) {
        formTarget.scrollIntoView({behavior: 'smooth', block: 'center'});
      }
    }
    if (fieldKey) {
      setTimeout(() => {
        const input = document.querySelector(
          `[name="${fieldKey}"], [data-field="${fieldKey}"]`,
        ) as HTMLElement;
        if (input) {
          input.focus();
        }
      }, 100);
    }
  };

  const handleSyncCustomerPicData = () => {
    setData(prev => syncCustomerAndPicIntoPreAnalysis(prev, props));
    props.notify?.('Customer & PIC data synced into Pre-Analysis!');
    scrollToPreviewElement('preana-preview-sec-1');
  };

  // Fetch saved pre-analysis data from server
  useEffect(() => {
    if (!props.applicationId) return;
    let isMounted = true;
    api(`/applications/${props.applicationId}/pre-analysis`)
      .then(res => {
        if (isMounted && res && res.success && res.data) {
          const raw = res.data;
          setData(prev => ({...prev, ...raw}));
          initialDataRef.current = structuredClone(raw);
        }
      })
      .catch(err => {
        console.warn('Failed to load pre-analysis data:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [props.applicationId]);

  const handleSave = async () => {
    setSaving(true);
    props.onSavingChange?.(true);
    try {
      const json = await api(`/applications/${props.applicationId}/pre-analysis`, 'PUT', data);
      if (json && json.success) {
        setSaveStatus('saved');
        props.notify?.('Pre-Analysis Form saved successfully!');
        const diffs = computePreAnalysisDiffs(initialDataRef.current, data);
        initialDataRef.current = structuredClone(data);
        props.onSaved?.(diffs);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
      props.onSavingChange?.(false);
    }
  };

  useEffect(() => {
    if (props.registerSave) {
      props.registerSave(handleSave);
    }
  });

  const scrollDebounceRef = useRef<any>(null);

  const autoSyncPreview = (fieldKey: string) => {
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      const targetId = 'preana-preview-cell-' + fieldKey;
      if (document.getElementById(targetId)) {
        scrollToPreviewElement(targetId);
      }
    }, 250);
  };

  const updateField = (key: keyof PreAnalysisData, val: any) => {
    if (viewMode === 'original-pdf') {
      setViewMode('digital-twin');
    }
    autoSyncPreview(key);
    setData(prev => {
      const next: PreAnalysisData = {...prev, [key]: val};
      if (key === 'uboInfo') {
        next.ubo = val;
        next.uboInfo = val;
      }
      if (key === 'ubo') {
        next.uboInfo = val;
        next.ubo = val;
      }
      if (key === 'holdingGroup' && val) {
        const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
        if (gs.holding) {
          const updatedGs: GroupStructureData = {
            ...gs,
            holding: {...gs.holding, name: val},
          };
          next.groupStructure = updatedGs;
          next.uboInformation = formatGroupStructureAsNarrative(updatedGs);
        }
      }
      return next;
    });
  };
  const {
    currentGroupStructure,
    sisterCompanyName,
    applicantCompanyName,
    groupSubsidiaries,
    getEntityReview,
    updateEntityReview,
    getGrandTotal,
    syncStructureIntoData,
    updateHoldingField,
    updateHoldingShareholder,
    addHoldingShareholder,
    removeHoldingShareholder,
    addSubsidiary,
    removeSubsidiary,
    updateSubsidiaryField,
    updateSubsidiaryShareholder,
    addSubsidiaryShareholder,
    removeSubsidiaryShareholder,
  } = useGroupStructure({data, setData, viewMode, setViewMode});

  const totalUnits = useMemo(() => {
    return (data.unitComposition || []).reduce((acc, u) => acc + (Number(u.qty) || 0), 0);
  }, [data.unitComposition]);
  const {pdfIframeRef, handlePrint} = usePreAnalysisPrint({data, viewMode});

  return {
    props,
    mandatoryRules,
    reqMark,
    initialDataRef,
    data,
    setData,
    isRecommended,
    viewMode,
    setViewMode,
    zoomLevel,
    setZoomLevel,
    saving,
    setSaving,
    saveStatus,
    setSaveStatus,
    openSections,
    setOpenSections,
    toggleSection,
    scrollToPreviewElement,
    handleTriggerSync,
    handlePreviewCellClick,
    handleSyncCustomerPicData,
    handleSave,
    scrollDebounceRef,
    autoSyncPreview,
    updateField,
    currentGroupStructure,
    sisterCompanyName,
    applicantCompanyName,
    groupSubsidiaries,
    getEntityReview,
    updateEntityReview,
    getGrandTotal,
    syncStructureIntoData,
    updateHoldingField,
    updateHoldingShareholder,
    addHoldingShareholder,
    removeHoldingShareholder,
    addSubsidiary,
    removeSubsidiary,
    updateSubsidiaryField,
    updateSubsidiaryShareholder,
    addSubsidiaryShareholder,
    removeSubsidiaryShareholder,
    totalUnits,
    pdfIframeRef,
    handlePrint,
  };
}
