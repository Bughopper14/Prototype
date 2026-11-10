/** Loads the saved Pre-Analysis, keeps its numbers in step with the application, reports changes upward and saves. */
import {useRef, useState, useEffect} from 'react';
import {api} from '@/shared/lib/api';
import {getTodaySignatureDate, defaultInitialData} from '@/features/pre-analysis/lib/defaults';
import {ensureProjectGroups} from '@/features/pre-analysis/lib/projects';
import {computePreAnalysisDiffs} from '@/features/pre-analysis/lib/diff';
import type {PreAnalysisFormProps} from '@/features/pre-analysis/lib/types';
import type {PreAnalysisDataState} from '@/features/pre-analysis/hooks/usePreAnalysisData';

export function usePreAnalysisPersistence(
  props: PreAnalysisFormProps,
  {setData, data}: PreAnalysisDataState,
) {
  const initialDataRef = useRef<any>(null);

  const [saving, setSaving] = useState(false);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!props.applicationId || props.applicationId === 'new' || props.isNew) return;
    let isMounted = true;
    api(`/applications/${props.applicationId}/pre-analysis`)
      .then(res => {
        if (isMounted && res && res.success && res.data) {
          const raw = res.data;
          const today = getTodaySignatureDate();
          // Always ensure signature date reflects today's current date when opening document
          raw.signatureDate = today;
          if (
            raw.starGroupMilestonesNarrative &&
            (!raw.companyBackground || !raw.companyBackground.includes('STAR Group'))
          ) {
            raw.companyBackground =
              `${raw.companyBackground || ''}\n\n${raw.starGroupMilestonesNarrative}`.trim();
          }
          raw.currentProjects = ensureProjectGroups(
            raw.currentProjects,
            defaultInitialData.currentProjects as any,
            'PT Handalan Putramas Santosa (HPS)',
          );
          raw.historyProjects = ensureProjectGroups(
            raw.historyProjects,
            defaultInitialData.historyProjects as any,
            'PT Pangan Sejahtera Santosa (PASS)',
          );
          raw.investmentProjectPlans = ensureProjectGroups(
            raw.investmentProjectPlans,
            defaultInitialData.investmentProjectPlans as any,
            'PT Harta Putramas Santosa (HTPS)',
          );
          if (!raw.investmentPlanSelected) {
            raw.investmentPlanSelected = defaultInitialData.investmentPlanSelected;
          }
          if (!raw.investmentPlanRemarks) {
            raw.investmentPlanRemarks = defaultInitialData.investmentPlanRemarks;
          }
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
  }, [props.applicationId, props.isNew]);

  useEffect(() => {
    props.onChange?.(data);
  }, [data]);

  useEffect(() => {
    if (props.assignedPreAnalysisNo) {
      const assigned = props.assignedPreAnalysisNo;
      setData(prev => ({...prev, preAnalysisNo: assigned}));
    }
  }, [props.assignedPreAnalysisNo]);

  useEffect(() => {
    if (props.application?.fapNumber && !props.application.fapNumber.includes('Auto')) {
      setData(prev => {
        if (prev.fapNumber !== props.application.fapNumber) {
          return {...prev, fapNumber: props.application.fapNumber};
        }
        return prev;
      });
    }
  }, [props.application?.fapNumber]);

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

  return {saveStatus, handleSave, saving};
}

export type PreAnalysisPersistenceState = ReturnType<typeof usePreAnalysisPersistence>;
