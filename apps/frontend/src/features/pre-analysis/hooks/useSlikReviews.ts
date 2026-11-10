/** SLIK / bureau review of each group entity (one per head project), with its default content. */
import {useMemo} from 'react';
import {ensureProjectGroups} from '@/features/pre-analysis/lib/projects';
import {defaultInitialData} from '@/features/pre-analysis/lib/defaults';
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
    const currentGroups = ensureProjectGroups(
      data.currentProjects,
      defaultInitialData.currentProjects as any,
      'PT Handalan Putramas Santosa (HPS)',
    );
    const historyGroups = ensureProjectGroups(
      data.historyProjects,
      defaultInitialData.historyProjects as any,
      'PT Pangan Sejahtera Santosa (PASS)',
    );
    const investmentGroups = ensureProjectGroups(
      data.investmentProjectPlans,
      defaultInitialData.investmentProjectPlans as any,
      'PT Harta Putramas Santosa (HTPS)',
    );

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
        if (/hps|handalan/i.test(rName) && /hps|handalan/i.test(eName)) return true;
        if (/pass|pangan/i.test(rName) && /pass|pangan/i.test(eName)) return true;
        if (/htps|harta/i.test(rName) && /htps|harta/i.test(eName)) return true;
        return false;
      });
    }

    if (existing) {
      return {
        ...existing,
        entityName: entityName || existing.entityName || `Entity #${idx + 1}`,
      };
    }

    // Default seed values based on entity type:
    // 1. Current Project Head A (PT Handalan Putramas Santosa / HPS) -> Sister company with leasing exposure records
    const isSister =
      (targetEntity && targetEntity.projectType === 'current' && targetEntity.letter === 'A') ||
      /sister|handalan|hps/i.test(entityName) ||
      (slikEntities.length >= 1 && idx === 0);
    // 2. Investment Project Plan (PT Harta Putramas Santosa / HTPS) -> Applicant company
    const isApplicant =
      (targetEntity && targetEntity.projectType === 'investment') ||
      /applicant|request|htps|harta/i.test(entityName) ||
      idx === slikEntities.length - 1;

    if (isSister) {
      return {
        id: `sub-${idx}`,
        entityName: entityName || 'PT HANDALAN PUTRAMAS SANTOSA (HPS)',
        hasRecord: true,
        noRecordRemarks: '',
        lenderExposures:
          data.lenderExposures && data.lenderExposures.length > 0
            ? data.lenderExposures
            : [
                {lender: 'PT Astra Sedaya Finance (ACC)', plafond: '11.737.642.751,00', rate: '6,24'},
                {lender: 'PT Bank Central Asia Tbk', plafond: '13.533.553.504,00', rate: '9,50'},
                {lender: 'PT Bank Nano Syariah', plafond: '6.163.669.402,00', rate: '-'},
                {
                  lender: 'PT Bank Saqu Indonesia (d.h PT Bank Jasa Jakarta)',
                  plafond: '2.738.552.586,00',
                  rate: '10,41',
                },
                {lender: 'PT Mandiri Tunas Finance (MTF)', plafond: '14.993.647.840,00', rate: '9,50'},
                {lender: 'PT Mitsui Leasing Capital Indonesia', plafond: '392.806.826,00', rate: '10,63'},
                {lender: 'PT Radana Bhaskara Finance', plafond: '3.273.898.464,00', rate: '7,20'},
                {lender: 'PT SMFL Leasing Indonesia', plafond: '4.301.044.800,00', rate: '12,49'},
                {
                  lender: 'PT Surya Artha Nusantara Finance (SANF)',
                  plafond: '23.538.710.000,00',
                  rate: '11,25',
                },
              ],
        pefindoNotes:
          data.pefindoNotes ||
          '<p>- PT HPS is existing customer of SANF, ACC, etc. Payment current, but for PT HPS there are no close contract because PT HPS also new established company in 2024. All leasing contracts still open.</p><p>- Its group : PT Harta Putramas Santosa (HTPS) is newly establish company, no record at all from Finco / Bank.</p><p>- New business diversification, PT HTPS doesnt have any experience in Harvesting.</p>',
        pefindoTerms:
          data.pefindoTerms ||
          '<p>Current PT HPS commercial term on other fincos : Flat rate 7%, 20% SD, Normal Installment - 36 months lease terms, Provision 1%, admin fee IDR 5 bio per contract</p>',
      };
    }

    if (isApplicant) {
      return {
        id: `sub-${idx}`,
        entityName: entityName || 'PT HARTA PUTRAMAS SANTOSA (HTPS)',
        hasRecord: false,
        noRecordRemarks: data.applicantPefindoCheck || '<p>NO RECORD SINCE ITS NEWLY ESTABLISHED</p>',
        lenderExposures: [],
        pefindoNotes: '',
        pefindoTerms: '',
      };
    }

    return {
      id: `sub-${idx}`,
      entityName: entityName || `PT Entity #${idx + 1}`,
      hasRecord: false,
      noRecordRemarks: '<p>Belum ada fasilitas kredit perbankan / leasing (No Record)</p>',
      lenderExposures: [],
      pefindoNotes: '',
      pefindoTerms: '',
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

export type SlikReviewsState = ReturnType<typeof useSlikReviews>;
