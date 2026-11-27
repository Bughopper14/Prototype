/** SLIK / bureau review of each group entity (one per head project), with its default content. */
import {useMemo} from 'react';
import {ensureProjectGroups} from '@/features/pre-analysis/lib/projects';
import type {EntitySlikReview, PreAnalysisData, LenderExposureItem} from '@/features/pre-analysis/lib/types';
import {parsePlafonNumber, formatPlafonCurrency} from '@/features/pre-analysis/lib/text';
import type {PreAnalysisDataState} from '@/features/pre-analysis/hooks/usePreAnalysisData';
import type {PreAnalysisViewState} from '@/features/pre-analysis/hooks/usePreAnalysisView';
import type {PreviewSyncState} from '@/features/pre-analysis/hooks/usePreviewSync';

export function useSlikReviews(
  {data, setData}: PreAnalysisDataState,
  {viewMode, setViewMode}: PreAnalysisViewState,
  {autoSyncPreview}: PreviewSyncState,
) {
  // SLIK Entities connected dynamically from Section 2 Head Projects (Current, History, Investment)
  const slikEntities = useMemo(() => {
    const currentGroups = ensureProjectGroups(data.currentProjects);
    const historyGroups = ensureProjectGroups(data.historyProjects);
    const investmentGroups = ensureProjectGroups(data.investmentProjectPlans);

    const list: {
      name: string;
      projectType: 'current' | 'history' | 'investment';
      letter: string;
      groupIndex: number;
    }[] = [];

    // 1. Current Project Head Projects
    currentGroups.forEach((g, i) => {
      const letter = String.fromCharCode(65 + i);
      const name = g.headName?.trim() || `Current Project Head ${letter}`;
      list.push({name, projectType: 'current', letter, groupIndex: i});
    });

    // 2. History Project Head Projects
    historyGroups.forEach((g, i) => {
      const letter = String.fromCharCode(65 + i);
      const name = g.headName?.trim() || `History Project Head ${letter}`;
      list.push({name, projectType: 'history', letter, groupIndex: i});
    });

    // 3. Investment Project Plan Head Projects
    investmentGroups.forEach((g, i) => {
      const letter = String.fromCharCode(65 + i);
      const name = g.headName?.trim() || `Investment Project Plan Head ${letter}`;
      list.push({name, projectType: 'investment', letter, groupIndex: i});
    });

    return list;
  }, [data.currentProjects, data.historyProjects, data.investmentProjectPlans]);

  const getEntityReview = (idx: number, entityName: string): EntitySlikReview => {
    const targetEntity = slikEntities[idx];
    const entityKey = targetEntity ? `${targetEntity.projectType}_${targetEntity.letter}` : String(idx);

    // 1. Try exact match by entityKey
    let existing = data.entitySlikReviews?.[entityKey];

    // 2. If not found by key, search in data.entitySlikReviews by matching entityName or project type
    if (!existing && data.entitySlikReviews) {
      existing = Object.values(data.entitySlikReviews).find(r => {
        if (!r.entityName) return false;
        const rName = r.entityName.trim().toLowerCase();
        const eName = (entityName || '').trim().toLowerCase();
        if (rName === eName) return true;
        return false;
      });
    }

    if (existing) {
      return {
        ...existing,
        entityName: entityName || existing.entityName || `Entity #${idx + 1}`,
      };
    }

    // A new entity starts empty; the first entity inherits top-level single-entity fields if present.
    const initialFields =
      idx === 0
        ? {lenderExposures: data.lenderExposures || [], pefindoNotes: data.pefindoNotes || '', pefindoTerms: data.pefindoTerms || ''}
        : {lenderExposures: [] as LenderExposureItem[], pefindoNotes: '', pefindoTerms: ''};
    const hasRecord = initialFields.lenderExposures.length > 0;
    return {
      id: `sub-${idx}`,
      entityName: entityName || `Entity #${idx + 1}`,
      hasRecord,
      noRecordRemarks: !hasRecord && idx === slikEntities.length - 1 ? data.applicantPefindoCheck || '' : '',
      ...initialFields,
    };
  };

  const updateEntityReview = (idx: number, patch: Partial<EntitySlikReview>) => {
    if (viewMode === 'original-pdf') {
      setViewMode('digital-twin');
    }
    const targetEntity = slikEntities[idx];
    const entityKey = targetEntity ? `${targetEntity.projectType}_${targetEntity.letter}` : String(idx);
    const current = getEntityReview(idx, slikEntities[idx]?.name || '');
    const updated: EntitySlikReview = {...current, ...patch};
    const nextReviews = {
      ...(data.entitySlikReviews || {}),
      [entityKey]: updated,
      [String(idx)]: updated,
    };

    const updates: Partial<PreAnalysisData> = {
      entitySlikReviews: nextReviews,
    };
    if (updated.hasRecord) {
      updates.lenderExposures = updated.lenderExposures;
      updates.pefindoNotes = updated.pefindoNotes;
      updates.pefindoTerms = updated.pefindoTerms;
    } else {
      if (
        /applicant|request|htps|harta/i.test(updated.entityName) ||
        (targetEntity && targetEntity.projectType === 'investment')
      ) {
        updates.applicantPefindoCheck = updated.noRecordRemarks;
      }
    }
    autoSyncPreview(`slik-${idx}`);
    setData(prev => ({...prev, ...updates}));
  };

  const getGrandTotal = (exposures: LenderExposureItem[] = []): string => {
    const total = exposures.reduce((sum, item) => sum + parsePlafonNumber(item.plafond), 0);
    return formatPlafonCurrency(total);
  };

  return {slikEntities, getEntityReview, getGrandTotal, updateEntityReview};
}

