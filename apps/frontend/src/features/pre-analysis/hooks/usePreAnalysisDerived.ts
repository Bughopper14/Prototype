/** Values worked out from the data: recommendation flags, investment plan options, signature date and total units. */
import {useMasterData} from '@/shared/master-data';
import {useMemo} from 'react';
import type {PreAnalysisDataState} from '@/features/pre-analysis/hooks/usePreAnalysisData';

export function usePreAnalysisDerived({data, todayDateStr}: PreAnalysisDataState) {
  const signatureDateToDisplay = data.signatureDate || todayDateStr;

  const recStr = (data.recommendation || '').trim().toUpperCase();

  const isNotRecommended = recStr.includes('NOT');

  const isProcessWithAr = recStr.includes('AR MANAGEMENT') || recStr.includes('PROCESS WITH AR');

  const isFullDoc = !isNotRecommended && !isProcessWithAr && recStr.includes('RECOMMEND');

  const isRecommended = isFullDoc || isProcessWithAr;

  const masterCatalog = useMasterData();

  const investmentPlanMasterItems = masterCatalog.preanInvestmentPlanOptions?.filter(x => x.active) || [
    {value: 'SD', name: 'SD (Security Deposit / Down Payment)', active: true},
    {value: 'Tenor', name: 'Tenor', active: true},
    {value: 'Rate', name: 'Rate', active: true},
    {value: 'Adm', name: 'Adm (Administration Fee)', active: true},
  ];

  const hasSelectedRecommendation = recStr.length > 0 && (isNotRecommended || isProcessWithAr || isFullDoc);

  const totalUnits = useMemo(() => {
    return (data.unitComposition || []).reduce((acc, u) => acc + (Number(u.qty) || 0), 0);
  }, [data.unitComposition]);

  return {
    investmentPlanMasterItems,
    totalUnits,
    isNotRecommended,
    isRecommended,
    isProcessWithAr,
    isFullDoc,
    signatureDateToDisplay,
    hasSelectedRecommendation,
  };
}

export type PreAnalysisDerivedState = ReturnType<typeof usePreAnalysisDerived>;
