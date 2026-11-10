/** The Pre-Analysis data being edited, and how one field is updated. */
import {useState} from 'react';
import {getTodaySignatureDate, defaultInitialData} from '@/features/pre-analysis/lib/defaults';
import type {
  PreAnalysisData,
  GroupStructureData,
  PreAnalysisFormProps,
} from '@/features/pre-analysis/lib/types';
import {syncCustomerAndPicIntoPreAnalysis} from '@/features/pre-analysis/lib/sync-customer';
import {
  DEFAULT_GROUP_STRUCTURE,
  formatGroupStructureAsNarrative,
} from '@/features/pre-analysis/lib/group-structure';
import type {PreAnalysisViewState} from '@/features/pre-analysis/hooks/usePreAnalysisView';
import type {PreviewSyncState} from '@/features/pre-analysis/hooks/usePreviewSync';

export function usePreAnalysisData(
  props: PreAnalysisFormProps,
  {viewMode, setViewMode}: PreAnalysisViewState,
  {autoSyncPreview}: PreviewSyncState,
) {
  const todayDateStr = getTodaySignatureDate();

  const [data, setData] = useState<PreAnalysisData>(() => {
    const initial = syncCustomerAndPicIntoPreAnalysis(defaultInitialData, props);
    initial.signatureDate = todayDateStr;
    return initial;
  });

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

  return {data, updateField, todayDateStr, setData};
}

export type PreAnalysisDataState = ReturnType<typeof usePreAnalysisData>;
